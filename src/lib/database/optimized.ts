// lib/database/optimized.ts - Optimized database queries
import { prisma } from '@/lib/prisma';
import { cache, CacheService } from '@/lib/cache/redis';
import { monitoring } from '@/lib/monitoring';

export class OptimizedDatabaseService {
  private cache: CacheService;

  constructor() {
    this.cache = cache;
  }

  // Contract operations with caching
  async getContract(id: string) {
    const cacheKey = CacheService.contractKey(id);
    const cached = await this.cache.get(cacheKey);
    
    if (cached) {
      monitoring.logEvent('db_cache_hit', { operation: 'getContract', id });
      return cached;
    }

    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        milestones: {
          orderBy: { id: 'asc' as const }
        },
      },
    });

    if (contract) {
      await this.cache.set(cacheKey, contract, 1800); // 30 minutes
      monitoring.logEvent('db_cache_set', { operation: 'getContract', id });
    }

    return contract;
  }

  async getContracts(filters: {
    status?: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    clientId?: string;
    providerId?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    const cacheKey = CacheService.contractsListKey(filters);
    const cached = await this.cache.get(cacheKey);
    
    if (cached) {
      monitoring.logEvent('db_cache_hit', { operation: 'getContracts', filters });
      return cached;
    }

    const { limit = 20, offset = 0, ...whereFilters } = filters;
    
    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
        where: whereFilters,
        include: {
          milestones: {
            select: {
              id: true,
              title: true,
              amount: true,
              status: true,
            },
            orderBy: { id: 'asc' as const }
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.contract.count({ where: whereFilters })
    ]);

    const result = {
      contracts,
      total,
      pagination: {
        limit,
        offset,
        totalPages: Math.ceil(total / limit),
        currentPage: Math.floor(offset / limit) + 1,
      }
    };

    await this.cache.set(cacheKey, result, 900); // 15 minutes
    monitoring.logEvent('db_cache_set', { operation: 'getContracts', filters });

    return result;
  }

  async createContract(data: any) {
    const contract = await prisma.contract.create({
      data: {
        ...data,
        milestones: {
          create: data.milestones.map((milestone: any) => ({
            ...milestone,
            status: 'pending',
          }))
        }
      },
      include: {
        milestones: true,
      }
    });

    // Invalidate related caches
    await this.invalidateContractCaches(contract.id);
    monitoring.logEvent('db_contract_created', { id: contract.id });

    return contract;
  }

  async updateContract(id: string, data: any) {
    const contract = await prisma.contract.update({
      where: { id },
      data,
      include: {
        milestones: true,
      }
    });

    // Invalidate related caches
    await this.invalidateContractCaches(id);
    monitoring.logEvent('db_contract_updated', { id });

    return contract;
  }

  // Milestone operations
  async getMilestone(id: string) {
    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: {
        contract: true,
        proofs: true,
      }
    });

    return milestone;
  }

  async updateMilestoneStatus(id: string, status: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'PAID' | 'DISPUTED', feedback?: string) {
    const milestone = await prisma.milestone.update({
      where: { id },
      data: {
        status,
      },
      include: {
        contract: true,
      }
    });

    // Invalidate contract cache
    await this.invalidateContractCaches(milestone.contractId);
    monitoring.logEvent('db_milestone_updated', { id, status });

    return milestone;
  }

  // Template operations with caching
  async getTemplates() {
    const cacheKey = CacheService.templatesListKey();
    const cached = await this.cache.get(cacheKey);
    
    if (cached) {
      monitoring.logEvent('db_cache_hit', { operation: 'getTemplates' });
      return cached;
    }

    // For now, return mock data since templates are in JSON files
    const templates = [
      {
        id: 'service',
        name: 'Contrat de Services',
        description: 'Contrat pour prestations de services',
        category: 'business',
        version: '2.0',
        isActive: true,
      },
      {
        id: 'travaux',
        name: 'Contrat de Travaux',
        description: 'Contrat pour travaux et construction',
        category: 'property',
        version: '2.0',
        isActive: true,
      },
      {
        id: 'creation',
        name: 'Contrat de Création',
        description: 'Contrat pour création artistique/intellectuelle',
        category: 'business',
        version: '2.0',
        isActive: true,
      },
    ];

    await this.cache.set(cacheKey, templates, 3600); // 1 hour
    monitoring.logEvent('db_cache_set', { operation: 'getTemplates' });

    return templates;
  }

  // Analytics and reporting
  async getContractStats() {
    const cacheKey = 'stats:contracts';
    const cached = await this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    const [
      totalContracts,
      activeContracts,
      completedContracts,
      totalAmount,
      contractsByStatus,
      contractsByMonth,
    ] = await Promise.all([
      prisma.contract.count(),
      prisma.contract.count({ where: { status: 'ACTIVE' } }),
      prisma.contract.count({ where: { status: 'COMPLETED' } }),
      prisma.contract.aggregate({
        _sum: { totalAmount: true },
      }),
      prisma.contract.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      prisma.contract.groupBy({
        by: ['createdAt'],
        _count: { id: true },
        where: {
          createdAt: {
            gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Last year
          }
        },
      }),
    ]);

    const stats = {
      totalContracts,
      activeContracts,
      completedContracts,
      totalAmount: totalAmount._sum.totalAmount || 0,
      contractsByStatus,
      contractsByMonth,
      completionRate: totalContracts > 0 ? (completedContracts / totalContracts) * 100 : 0,
    };

    await this.cache.set(cacheKey, stats, 1800); // 30 minutes
    return stats;
  }

  // Cache invalidation helpers
  private async invalidateContractCaches(contractId: string) {
    const patterns = [
      CacheService.contractKey(contractId),
      'contracts:list:*',
      'stats:contracts',
    ];

    for (const pattern of patterns) {
      if (pattern.includes('*')) {
        // For wildcard patterns, we'd need Redis SCAN
        // For now, just clear specific keys
        continue;
      }
      await this.cache.del(pattern);
    }
  }

  // Health check
  async healthCheck() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', latency: Date.now() };
    } catch (error: any) {
      return { status: 'unhealthy', error: error.message };
    }
  }
}

export const db = new OptimizedDatabaseService();

// Database query optimization helpers
export class QueryOptimizer {
  static async paginate<T>(
    query: any,
    page: number = 1,
    limit: number = 20
  ) {
    const offset = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      query.take(limit).skip(offset),
      prisma.$queryRaw`SELECT COUNT(*) as count FROM (${query}) as subquery`
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total: Number((total as any)[0].count),
        totalPages: Math.ceil(Number((total as any)[0].count) / limit),
      }
    };
  }

  static async batch<T>(
    items: T[],
    batchSize: number = 100,
    processor: (batch: T[]) => Promise<any>
  ) {
    const results = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const result = await processor(batch);
      results.push(result);
    }
    
    return results;
  }
}
