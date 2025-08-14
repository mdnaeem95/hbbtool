/* eslint-disable no-console */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { db, MerchantStatus } from '@kitchencloud/database'

// --- Config (requires env) ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY! // required for admin confirm/delete

function assert(cond: any, msg: string) {
  if (!cond) throw new Error(`❌ ${msg}`)
  console.log(`✅ ${msg}`)
}

async function main() {
  console.log('---- AUTH E2E smoke test starting ----')

  // Unique test identity
  const suffix = Date.now().toString(36)
  const email = `merchant.e2e+${suffix}@example.com`
  const password = 'Sup3r$tr0ng-Password!'

  // Clients
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY) // normal auth
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) // admin API

  // 1) Sign up merchant with metadata
  const { data: signup, error: signupErr } = await userClient.auth.signUp({
    email,
    password,
    options: { data: { userType: 'merchant' } },
  })
  assert(!signupErr, `Merchant sign-up created: ${email}`)

  const userId = signup.user?.id!
  assert(!!userId, 'Received user id from sign-up')

  // 2) Confirm email (so we can sign in immediately on projects that require confirmation)
  const { data: upd, error: updErr } = await admin.auth.admin.updateUserById(userId, {
    email_confirm: true,
    // keep metadata intact (Supabase preserves user_metadata by default)
  })
  assert(!updErr, 'Admin confirmed user email')
  assert(upd?.user?.user_metadata?.userType === 'merchant', 'userType=merchant preserved')

  // 3) Ensure merchant row exists (if your DB trigger didn’t auto-create it)
  let merchant = await db.merchant.findFirst({ where: { id: userId, deletedAt: null } })
  if (!merchant) {
    merchant = await db.merchant.create({
      data: {
        id: userId, // align auth uid = merchant.id
        email,
        phone: '',
        businessName: `E2E Merchant ${suffix}`,
        slug: `e2e-merchant-${suffix}`,
        password: 'N/A',
        status: MerchantStatus.ACTIVE,
      },
    })
    console.log('ℹ️ Created merchant via bootstrap (trigger not found)')
  }
  assert(merchant.id === userId, 'Merchant row exists and matches auth uid')
  assert(merchant.status === MerchantStatus.ACTIVE, 'Merchant is ACTIVE')

  // 4) Password sign-in should succeed
  const { data: signin, error: signinErr } = await userClient.auth.signInWithPassword({ email, password })
  assert(!signinErr, 'Merchant password sign-in succeeded')
  assert(signin.user?.id === userId, 'Signed-in user matches signup user')

  // 5) Sign out should succeed
  const { error: signOutErr } = await userClient.auth.signOut()
  assert(!signOutErr, 'Sign-out succeeded')

  console.log('---- AUTH E2E smoke test passed ✅ ----')

  // 6) Cleanup test user (admin) — comment out if you want to inspect in dashboard
  const { error: delErr } = await admin.auth.admin.deleteUser(userId)
  if (delErr) {
    console.warn('⚠️ Could not delete test user (admin):', delErr.message)
  } else {
    console.log('🧹 Deleted test user (admin)')
  }

  // Optionally soft-delete the merchant row to leave DB tidy
  try {
    await db.merchant.softDelete({ id: merchant.id })
  } catch {
    // if your extension keying differs, fall back to delete:
    try { await db.merchant.delete({ where: { id: merchant.id } }) } catch {}
  }
}

main().catch((err) => {
  console.error('\n---- AUTH E2E smoke test failed ❌ ----')
  console.error(err)
  process.exit(1)
})
