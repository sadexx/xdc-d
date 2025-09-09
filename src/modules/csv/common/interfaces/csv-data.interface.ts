import { ECsvName } from "src/modules/csv/common/enums";
import {
  IAppointmentsCsv,
  ICompaniesCsv,
  IDraftAppointmentsCsv,
  IEmployeesCsv,
  IUsersCsv,
} from "src/modules/csv/common/interfaces/csv-data";

export interface ICsvData {
  data: CsvData;
  limit?: number;
}

export interface IAppointmentsCsvData {
  fileName: ECsvName.APPOINTMENTS;
  csvDataMapping: Record<keyof IAppointmentsCsv, string>;
  fetchDataFn: (offset: number, limit: number) => Promise<IAppointmentsCsv[]>;
}

export interface IDraftAppointmentsCsvData {
  fileName: ECsvName.DRAFT_APPOINTMENTS;
  csvDataMapping: Record<keyof IDraftAppointmentsCsv, string>;
  fetchDataFn: (offset: number, limit: number) => Promise<IDraftAppointmentsCsv[]>;
}

export interface IUsersCsvData {
  fileName: ECsvName.USERS;
  csvDataMapping: Record<keyof IUsersCsv, string>;
  fetchDataFn: (offset: number, limit: number) => Promise<IUsersCsv[]>;
}

export interface ICompaniesCsvData {
  fileName: ECsvName.COMPANIES;
  csvDataMapping: Record<keyof ICompaniesCsv, string>;
  fetchDataFn: (offset: number, limit: number) => Promise<ICompaniesCsv[]>;
}

export interface IEmployeesCsvData {
  fileName: ECsvName.EMPLOYEES;
  csvDataMapping: Record<keyof IEmployeesCsv, string>;
  fetchDataFn: (offset: number, limit: number) => Promise<IEmployeesCsv[]>;
}

export type CsvData =
  | IAppointmentsCsvData
  | IDraftAppointmentsCsvData
  | IUsersCsvData
  | ICompaniesCsvData
  | IEmployeesCsvData;
