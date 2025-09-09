/* eslint-disable @typescript-eslint/no-magic-numbers */
import { Module } from "@nestjs/common";
import { PrometheusService } from "src/modules/prometheus/services";
import {
  makeCounterProvider,
  makeGaugeProvider,
  makeHistogramProvider,
  makeSummaryProvider,
  PrometheusModule,
} from "@willsoto/nestjs-prometheus";

@Module({
  imports: [
    PrometheusModule.register({
      path: "/metrics",
    }),
  ],
  providers: [
    PrometheusService,
    makeHistogramProvider({
      name: "http_request_duration_seconds",
      help: "Duration of HTTP requests in seconds",
      labelNames: ["method", "route", "status_code"],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    }),
    makeSummaryProvider({
      name: "http_request_summary_seconds",
      help: "Summary of HTTP request durations in seconds",
      labelNames: ["method", "route", "status_code"],
      percentiles: [0.01, 0.05, 0.5, 0.9, 0.95, 0.99],
    }),
    makeGaugeProvider({
      name: "cron_task_status",
      help: "Status of cron task execution: 0=error, 1=pending, 2=success",
      labelNames: ["task_id", "task_name"],
    }),
    makeCounterProvider({
      name: "cron_task_success_total",
      help: "Total number of successful cron task executions",
      labelNames: ["task_id", "task_name"],
    }),
    makeCounterProvider({
      name: "cron_task_failure_total",
      help: "Total number of failed cron task executions",
      labelNames: ["task_id", "task_name"],
    }),
    makeGaugeProvider({
      name: "cron_task_duration_seconds",
      help: "Duration of cron task execution in seconds",
      labelNames: ["task_id", "task_name"],
    }),
    makeGaugeProvider({
      name: "cron_task_last_execution_timestamp",
      help: "Timestamp of the last execution of a cron task",
      labelNames: ["task_id", "task_name"],
    }),
    makeGaugeProvider({
      name: "node_ws_connected_clients",
      help: "Number of connected websocket clients",
      labelNames: ["namespace"],
    }),
    makeCounterProvider({
      name: "node_ws_messages_sent_total",
      help: "Total number of messages sent",
      labelNames: ["namespace"],
    }),
    makeCounterProvider({
      name: "node_ws_connection_duration_le_5",
      help: "Number of connections with duration less than or equal to 5 seconds",
    }),
    makeCounterProvider({
      name: "node_ws_connection_duration_le_15",
      help: "Number of connections with duration less than or equal to 15 seconds",
    }),
    makeCounterProvider({
      name: "node_ws_connection_duration_le_30",
      help: "Number of connections with duration less than or equal to 30 seconds",
    }),
    makeCounterProvider({
      name: "node_ws_connection_duration_le_60",
      help: "Number of connections with duration less than or equal to 60 seconds",
    }),
    makeCounterProvider({
      name: "node_ws_connection_duration_le_120",
      help: "Number of connections with duration less than or equal to 120 seconds",
    }),
    makeCounterProvider({
      name: "node_ws_connection_duration_le_300",
      help: "Number of connections with duration less than or equal to 300 seconds",
    }),
    makeCounterProvider({
      name: "node_ws_connection_duration_le_600",
      help: "Number of connections with duration less than or equal to 600 seconds",
    }),
    makeCounterProvider({
      name: "node_ws_connection_duration_le_900",
      help: "Number of connections with duration less than or equal to 900 seconds",
    }),
    makeCounterProvider({
      name: "node_ws_connection_duration_le_1800",
      help: "Number of connections with duration less than or equal to 1800 seconds",
    }),
    makeCounterProvider({
      name: "node_ws_connection_duration_gt_1800",
      help: "Number of connections with duration greater than 1800 seconds",
    }),
  ],
  exports: [PrometheusService],
})
export class CustomPrometheusModule {}
