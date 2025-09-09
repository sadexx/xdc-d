/* eslint-disable @typescript-eslint/no-magic-numbers */
import { Injectable } from "@nestjs/common";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import { Counter, Gauge, Histogram, Summary } from "prom-client";

@Injectable()
export class PrometheusService {
  constructor(
    @InjectMetric("node_ws_connected_clients") public connectedClientsGauge: Gauge<string>,
    @InjectMetric("node_ws_messages_sent_total") public messagesSentCounter: Counter<string>,
    @InjectMetric("node_ws_connection_duration_le_5") private le5Counter: Counter<string>,
    @InjectMetric("node_ws_connection_duration_le_15") private le15Counter: Counter<string>,
    @InjectMetric("node_ws_connection_duration_le_30") private le30Counter: Counter<string>,
    @InjectMetric("node_ws_connection_duration_le_60") private le60Counter: Counter<string>,
    @InjectMetric("node_ws_connection_duration_le_120") private le120Counter: Counter<string>,
    @InjectMetric("node_ws_connection_duration_le_300") private le300Counter: Counter<string>,
    @InjectMetric("node_ws_connection_duration_le_600") private le600Counter: Counter<string>,
    @InjectMetric("node_ws_connection_duration_le_900") private le900Counter: Counter<string>,
    @InjectMetric("node_ws_connection_duration_le_1800") private le1800Counter: Counter<string>,
    @InjectMetric("node_ws_connection_duration_gt_1800") private gt1800Counter: Counter<string>,
    @InjectMetric("http_request_duration_seconds") private readonly httpRequestDurationHistogram: Histogram<string>,
    @InjectMetric("http_request_summary_seconds") private readonly httpRequestDurationSummary: Summary<string>,
    @InjectMetric("cron_task_status") public cronTaskStatusGauge: Gauge<string>,
    @InjectMetric("cron_task_success_total") public cronTaskSuccessCounter: Counter<string>,
    @InjectMetric("cron_task_failure_total") public cronTaskFailureCounter: Counter<string>,
    @InjectMetric("cron_task_duration_seconds") public cronTaskDurationGauge: Gauge<string>,
    @InjectMetric("cron_task_last_execution_timestamp") public cronTaskLastExecutionGauge: Gauge<string>,
  ) {}

  /**
   * Records the duration of an HTTP request in both histogram and summary metrics.
   *
   * @param method - The HTTP method used for the request (e.g., GET, POST).
   * @param route - The route or endpoint that was accessed.
   * @param statusCode - The HTTP status code returned by the request.
   * @param durationInSeconds - The duration of the request in seconds.
   */

  public recordHttpRequestDuration(method: string, route: string, statusCode: number, durationInSeconds: number): void {
    this.httpRequestDurationHistogram.labels(method, route, statusCode.toString()).observe(durationInSeconds);

    this.httpRequestDurationSummary.labels(method, route, statusCode.toString()).observe(durationInSeconds);
  }

  /**
   * Increments the appropriate counter based on the duration of a WebSocket connection.
   *
   * This method determines the duration range in which the provided duration falls
   * and increments the corresponding counter. The counters represent ranges of
   * connection durations in seconds.
   *
   * @param duration - The duration of the WebSocket connection in seconds.
   */
  public incrementCounter(duration: number): void {
    switch (true) {
      case duration <= 5:
        this.le5Counter.inc();
        break;
      case duration <= 15:
        this.le15Counter.inc();
        break;
      case duration <= 30:
        this.le30Counter.inc();
        break;
      case duration <= 60:
        this.le60Counter.inc();
        break;
      case duration <= 120:
        this.le120Counter.inc();
        break;
      case duration <= 300:
        this.le300Counter.inc();
        break;
      case duration <= 600:
        this.le600Counter.inc();
        break;
      case duration <= 900:
        this.le900Counter.inc();
        break;
      case duration <= 1800:
        this.le1800Counter.inc();
        break;
      default:
        this.gt1800Counter.inc();
        break;
    }
  }

  /**
   * Signals the start of a cron task execution.
   *
   * This method will set the task status to "pending" (1) and update the last execution timestamp.
   *
   * @param taskId - The identifier of the task.
   * @param taskName - The name of the task.
   */
  public startCronTaskExecution(taskId: string, taskName: string): void {
    this.cronTaskStatusGauge.labels(taskId, taskName).set(1);
    this.cronTaskLastExecutionGauge.labels(taskId, taskName).set(Date.now() / 1000);
  }

  /**
   * Records the successful execution of a cron task.
   *
   * This method will set the task status to "success" (2), increment the success counter, and record the duration of the task.
   *
   * @param taskId - The identifier of the task.
   * @param taskName - The name of the task.
   * @param durationInSeconds - The duration of the task in seconds.
   */
  public recordCronTaskSuccess(taskId: string, taskName: string, durationInSeconds: number): void {
    this.cronTaskStatusGauge.labels(taskId, taskName).set(2);
    this.cronTaskSuccessCounter.labels(taskId, taskName).inc();
    this.cronTaskDurationGauge.labels(taskId, taskName).set(durationInSeconds);
  }

  /**
   * Records the failure of a cron task execution.
   *
   * This method will set the task status to "error" (0), increment the failure counter, and record the duration of the task.
   *
   * @param taskId - The identifier of the task.
   * @param taskName - The name of the task.
   * @param durationInSeconds - The duration of the task in seconds.
   */
  public recordCronTaskFailure(taskId: string, taskName: string, durationInSeconds: number): void {
    this.cronTaskStatusGauge.labels(taskId, taskName).set(0);
    this.cronTaskFailureCounter.labels(taskId, taskName).inc();
    this.cronTaskDurationGauge.labels(taskId, taskName).set(durationInSeconds);
  }
}
