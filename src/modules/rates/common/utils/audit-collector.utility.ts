import { AuditStep } from "src/modules/rates/common/interfaces";

export class AuditCollector {
  private steps: AuditStep[] = [];
  addStep(step: Omit<AuditStep, "timestamp">): void {
    this.steps.push({
      ...step,
      stepInfo: JSON.parse(JSON.stringify(step.stepInfo)) as AuditStep["stepInfo"],
      timestamp: new Date(),
    });
  }

  getSteps(): AuditStep[] {
    return this.steps;
  }
}
