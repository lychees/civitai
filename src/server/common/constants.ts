import { MetricTimeframe } from '@prisma/client';
import { ModelSort } from '~/server/common/enums';

export const constants = {
  modelFilterDefaults: {
    sort: ModelSort.HighestRated,
    period: MetricTimeframe.AllTime,
  },
  baseModels: ['SD 1.4', 'SD 1.5', 'SD 2.0', 'SD 2.1', 'SD 2.0 768', 'Other'],
} as const;

export type BaseModel = typeof constants.baseModels[number];