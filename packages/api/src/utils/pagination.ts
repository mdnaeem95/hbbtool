interface PaginationInput {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export function getPaginationParams(input: PaginationInput) {
  const skip = (input.page - 1) * input.limit
  const take = input.limit
  
  const orderBy = input.sortBy 
    ? { [input.sortBy]: input.sortOrder || 'desc' }
    : undefined
    
  return { skip, take, orderBy }
}

export async function paginatedResponse(
  model: any,
  where: any,
  pagination: PaginationInput,
  include?: any
) {
  const { skip, take, orderBy } = getPaginationParams(pagination)
  
  const [items, total] = await Promise.all([
    model.findMany({
      where,
      skip,
      take,
      orderBy,
      include,
    }),
    model.count({ where }),
  ])
  
  return {
    items,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  }
}
