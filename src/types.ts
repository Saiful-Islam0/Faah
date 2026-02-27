export interface FaahConfig {
  enabled: boolean;
  volume: number;              // 0–100
  customSoundPath: string;
  cooldownMs: number;
  alerts: {
    diagnosticErrors: boolean;
    testFailures: boolean;
    terminalExitCode: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;             // 'HH:MM'hshs
    end: string;               // 'HH:MM'
  };
}

export type TriggerSource = 'diagnostic' | 'test' | 'terminal';

export interface PlayRequest {
  source: TriggerSource;
  timestamp: number;
}