import { HttpStatus, Injectable } from "@nestjs/common";
import { PassThrough, Readable } from "node:stream";
import { ECsvName } from "src/modules/csv/common/enums";
import { Response } from "express";
import { ICsvData } from "src/modules/csv/common/interfaces";
import { CsvBuilderService } from "src/modules/csv/services";
import { formatRow, getAppointmentCsvMapping } from "src/modules/csv/common/helpers";
import {
  companiesCsvDataMapping,
  draftAppointmentCsvDataMapping,
  employeesCsvDataMapping,
  usersCsvDataMapping,
} from "src/modules/csv/common/constants";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import {
  GetCsvAppointmentsDto,
  GetCsvCompaniesDto,
  GetCsvDraftAppointmentsDto,
  GetCsvEmployeesDto,
  GetCsvUsersDto,
} from "src/modules/csv/common/dto";
import { once } from "node:events";
import { CsvQueueStorageService } from "src/modules/csv/common/storages";

@Injectable()
export class CsvService {
  private readonly DEFAULT_LIMIT = 500;
  constructor(
    private readonly csvBuilderService: CsvBuilderService,
    private readonly csvQueueStorageService: CsvQueueStorageService,
  ) {}

  private async exportCsv(res: Response, options: ICsvData, user?: ITokenUserData): Promise<void> {
    await this.csvQueueStorageService.acquireSlot(user);
    try {
      const { data } = options;
      const firstBatch = await data.fetchDataFn(0, 1);

      if (firstBatch.length === 0) {
        res.status(HttpStatus.NO_CONTENT).send();

        return;
      }

      this.setCsvHeaders(res, data.fileName);

      const csvStream = await this.createCsvStream(options);
      csvStream.pipe(res);

      await new Promise((resolve) => {
        res.on("finish", resolve);
        res.on("close", resolve);
      });
    } finally {
      await this.csvQueueStorageService.releaseSlot(user);
    }
  }

  private setCsvHeaders(res: Response, fileName: string): void {
    const timestamp = new Date().toISOString();
    const fileNameWithTimestamp = `${fileName}-${timestamp}.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${fileNameWithTimestamp}"`);
  }

  private async createCsvStream(options: ICsvData): Promise<Readable> {
    const { data, limit = this.DEFAULT_LIMIT } = options;
    const stream = new PassThrough();
    let offset = 0;

    const writeData = async (): Promise<void> => {
      try {
        const tableHeaders = Object.values(data.csvDataMapping).join(",");
        stream.write(tableHeaders + "\n");

        while (true) {
          const fetchedData = await data.fetchDataFn(offset, limit);

          if (fetchedData.length === 0) {
            break;
          }

          for (const item of fetchedData) {
            if (!stream.write(formatRow(item, data.csvDataMapping))) {
              await once(stream, "drain");
            }
          }

          if (fetchedData.length < limit) {
            break;
          }

          offset += limit;
        }
      } catch (error) {
        stream.emit("error", error);
      } finally {
        stream.end();
      }
    };

    void writeData();

    return stream;
  }

  public async exportAppointmentsCsv(
    res: Response,
    user: ITokenUserData,
    dto: GetCsvAppointmentsDto,
    isArchived: boolean = false,
  ): Promise<void> {
    const options: ICsvData = {
      data: {
        fileName: ECsvName.APPOINTMENTS,
        csvDataMapping: getAppointmentCsvMapping(user),
        fetchDataFn: (offset: number, limit: number) =>
          this.csvBuilderService.getAppointmentsCsvData(user, dto, isArchived, offset, limit),
      },
    };
    await this.exportCsv(res, options, user);
  }

  public async exportDraftAppointmentsCsv(
    res: Response,
    user: ITokenUserData,
    dto: GetCsvDraftAppointmentsDto,
  ): Promise<void> {
    const options: ICsvData = {
      data: {
        fileName: ECsvName.DRAFT_APPOINTMENTS,
        csvDataMapping: draftAppointmentCsvDataMapping,
        fetchDataFn: (offset: number, limit: number) =>
          this.csvBuilderService.getDraftAppointmentsCsvData(user, dto, offset, limit),
      },
    };
    await this.exportCsv(res, options, user);
  }

  public async exportUsersCsv(res: Response, user: ITokenUserData, dto: GetCsvUsersDto): Promise<void> {
    const options: ICsvData = {
      data: {
        fileName: ECsvName.USERS,
        csvDataMapping: usersCsvDataMapping,
        fetchDataFn: (offset: number, limit: number) => this.csvBuilderService.getUsersCsvData(dto, offset, limit),
      },
    };
    await this.exportCsv(res, options, user);
  }

  public async exportCompaniesCsv(res: Response, user: ITokenUserData, dto: GetCsvCompaniesDto): Promise<void> {
    const options: ICsvData = {
      data: {
        fileName: ECsvName.COMPANIES,
        csvDataMapping: companiesCsvDataMapping,
        fetchDataFn: (offset: number, limit: number) =>
          this.csvBuilderService.getCompaniesCsvData(user, dto, offset, limit),
      },
    };
    await this.exportCsv(res, options, user);
  }

  public async exportEmployeesCsv(res: Response, user: ITokenUserData, dto: GetCsvEmployeesDto): Promise<void> {
    const options: ICsvData = {
      data: {
        fileName: ECsvName.EMPLOYEES,
        csvDataMapping: employeesCsvDataMapping,
        fetchDataFn: (offset: number, limit: number) =>
          this.csvBuilderService.getEmployeesCsvData(user, dto, offset, limit),
      },
    };
    await this.exportCsv(res, options, user);
  }
}
