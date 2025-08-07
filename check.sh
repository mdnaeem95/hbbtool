#!/bin/bash

echo "Checking UI components for missing 'use client' directives..."
echo "============================================="

cd packages/ui/src

for file in *.tsx; do
  if [ -f "$file" ]; then
    # Check if file contains React hooks, forwardRef, or Radix imports
    if grep -E "(useState|useEffect|useRef|forwardRef|@radix-ui)" "$file" > /dev/null; then
      # Check if file has 'use client' at the top
      if ! head -n 1 "$file" | grep -q "use client"; then
        echo "❌ $file - Missing 'use client' directive"
        echo "   Found: $(grep -E "(useState|useEffect|useRef|forwardRef|@radix-ui)" "$file" | head -n 1)"
      else
        echo "✅ $file - Has 'use client' directive"
      fi
    else
      echo "⚪ $file - Doesn't need 'use client' (no hooks/forwardRef/Radix)"
    fi
  fi
done