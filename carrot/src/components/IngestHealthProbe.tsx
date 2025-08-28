'use client';

import { useState, useEffect } from 'react';

interface HealthStatus {
  isHealthy: boolean;
  lastChecked: Date | null;
  error?: string;
}

export function IngestHealthProbe() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    isHealthy: true,
    lastChecked: null,
  });

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const workerUrl = process.env.NEXT_PUBLIC_INGEST_WORKER_URL || 
          'https://fullworker-lnkm5qvx3a-uc.a.run.app';
        
        const response = await fetch(`${workerUrl}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        setHealthStatus({
          isHealthy: response.ok,
          lastChecked: new Date(),
          error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
        });
      } catch (error) {
        setHealthStatus({
          isHealthy: false,
          lastChecked: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    // Check immediately
    checkHealth();

    // Check every 5 minutes
    const interval = setInterval(checkHealth, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  if (healthStatus.isHealthy) {
    return null; // Don't show anything when healthy
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            Video Processing Service Unavailable
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>
              Video uploads may fail or take longer than usual. 
              {healthStatus.error && ` Error: ${healthStatus.error}`}
            </p>
            {healthStatus.lastChecked && (
              <p className="mt-1 text-xs">
                Last checked: {healthStatus.lastChecked.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
