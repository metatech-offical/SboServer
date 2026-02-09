import ReportProblemModel, { IReportProblem } from "./reportProblem.schema";

export const createProblemReport = (
  report: Partial<IReportProblem>
): Promise<IReportProblem> => {
  return ReportProblemModel.create(report);
};
