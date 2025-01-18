interface Todo {
  completed: boolean;
  priority: number;
  value: number;
  timeRequired: number;
  deadline?: number;
  createdAt: number;
  project?: {
    weight: number;
  };
}

interface Weights {
  priority: number;
  value: number;
  timeRequired: number;
  deadline: number;
  urgency: number;
}

interface WorkSchedule {
  hoursPerDay: number;
  daysPerWeek: number;
}

export class PughScoreCalculator {
  private static readonly WEIGHTS: Weights = {
    priority: 0.3,
    value: 0.2,
    timeRequired: 0.2,
    deadline: 0.15,
    urgency: 0.15,
  };

  private static readonly WORK_SCHEDULE: WorkSchedule = {
    hoursPerDay: 2,
    daysPerWeek: 5,
  };

  private static readonly TIME_BUFFER_FACTOR = 1.5;
  private static readonly URGENCY_BASELINE_DAYS = 14;
  private static readonly MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

  static calculatePughScore(todo: Todo): number {
    if (todo.completed) {
      return -1;
    }

    const normalizedComponents = this.getNormalizedComponents(todo);
    const deadlineFactor = this.calculateDeadlineFactor(todo);
    const urgencyFactor = this.calculateUrgencyFactor(todo);

    const weightedScore = this.calculateWeightedScore(normalizedComponents, deadlineFactor, urgencyFactor);

    const projectMultiplier = todo.project?.weight ?? 1;
    return weightedScore * projectMultiplier;
  }

  static getNormalizedComponents(todo: Todo): {
    priority: number;
    value: number;
    time: number;
  } {
    return {
      priority: todo.priority / 10,
      value: todo.value / 10,
      time: Math.min(todo.timeRequired / PughScoreCalculator.WORK_SCHEDULE.hoursPerDay, 1),
    };
  }

  static calculateDeadlineFactor(todo: Todo): number {
    if (!todo.deadline) {
      return 0;
    }

    const now = Date.now();
    const daysUntilDeadline = (todo.deadline - now) / PughScoreCalculator.MILLISECONDS_PER_DAY;
    const effectiveDays = this.calculateEffectiveDays(daysUntilDeadline, todo.timeRequired);

    if (effectiveDays <= 0) {
      return 1;
    }
    if (effectiveDays <= 7) {
      return 1 - Math.pow(effectiveDays / 7, 2);
    }
    if (effectiveDays <= 30) {
      return 0.5 - (effectiveDays - 7) / 46;
    }
    return 0.1;
  }

  static calculateEffectiveDays(daysUntilDeadline: number, hoursRequired: number): number {
    const bufferHours = hoursRequired * PughScoreCalculator.TIME_BUFFER_FACTOR;
    return daysUntilDeadline - bufferHours / PughScoreCalculator.WORK_SCHEDULE.hoursPerDay;
  }

  static calculateUrgencyFactor(todo: Todo): number {
    const daysSinceCreation = (Date.now() - todo.createdAt) / PughScoreCalculator.MILLISECONDS_PER_DAY;
    return Math.min(Math.pow(daysSinceCreation / PughScoreCalculator.URGENCY_BASELINE_DAYS, 1.5), 1);
  }

  static calculateWeightedScore(
    normalized: { priority: number; value: number; time: number },
    deadlineFactor: number,
    urgencyFactor: number
  ): number {
    return (
      normalized.priority * PughScoreCalculator.WEIGHTS.priority +
      normalized.value * PughScoreCalculator.WEIGHTS.value -
      normalized.time * PughScoreCalculator.WEIGHTS.timeRequired +
      deadlineFactor * PughScoreCalculator.WEIGHTS.deadline +
      urgencyFactor * PughScoreCalculator.WEIGHTS.urgency
    );
  }
}
