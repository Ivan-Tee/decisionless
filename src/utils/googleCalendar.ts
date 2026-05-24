import { getLocalDateKey, roundDownToNearestFive } from "@/utils/date";

type GoogleCalendarEvent = {
  start?: {
    date?: string;
    dateTime?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
  };
};

type GoogleCalendarResponse = {
  items?: GoogleCalendarEvent[];
};

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleTokenClient = {
  requestAccessToken: (options?: { prompt?: string }) => void;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (options: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
            error_callback?: (error: unknown) => void;
          }) => GoogleTokenClient;
        };
      };
    };
  }
}

const GOOGLE_IDENTITY_SCRIPT = "https://accounts.google.com/gsi/client";
const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

export function parseClockTime(value: string) {
  const match = value.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);

  if (!match) {
    return null;
  }

  return {
    hours: Number(match[1]),
    minutes: Number(match[2])
  };
}

export function getWindowDates(startTime: string, endTime: string) {
  const start = parseClockTime(startTime);
  const end = parseClockTime(endTime);

  if (!start || !end) {
    return null;
  }

  const today = getLocalDateKey();
  const startDate = new Date(`${today}T${startTime}:00`);
  const endDate = new Date(`${today}T${endTime}:00`);

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    startDate.getTime() >= endDate.getTime()
  ) {
    return null;
  }

  return {
    start: startDate,
    end: endDate
  };
}

function getCalculationWindowDates(startTime: string, endTime: string, now = new Date()) {
  const selectedWindow = getWindowDates(startTime, endTime);

  if (!selectedWindow) {
    return null;
  }

  const start = new Date(Math.max(selectedWindow.start.getTime(), now.getTime()));

  return {
    start,
    end: selectedWindow.end
  };
}

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_IDENTITY_SCRIPT}"]`
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Google sign-in could not load.")), {
        once: true
      });
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_IDENTITY_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google sign-in could not load."));
    document.head.appendChild(script);
  });
}

async function getGoogleAccessToken(clientId: string) {
  await loadGoogleIdentityScript();

  return new Promise<string>((resolve, reject) => {
    const tokenClient = window.google?.accounts?.oauth2?.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_CALENDAR_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(
            new Error(
              response.error_description ??
                "Google Calendar permission was not granted. You can still enter time manually."
            )
          );
          return;
        }

        resolve(response.access_token);
      },
      error_callback: () =>
        reject(new Error("Google sign-in failed. You can still enter time manually."))
    });

    if (!tokenClient) {
      reject(new Error("Google sign-in is unavailable in this browser."));
      return;
    }

    tokenClient.requestAccessToken({ prompt: "consent" });
  });
}

function mergeBusyIntervals(intervals: Array<{ start: number; end: number }>) {
  const sortedIntervals = [...intervals].sort((left, right) => left.start - right.start);
  const mergedIntervals: Array<{ start: number; end: number }> = [];

  for (const interval of sortedIntervals) {
    const previous = mergedIntervals[mergedIntervals.length - 1];

    if (!previous || interval.start > previous.end) {
      mergedIntervals.push({ ...interval });
      continue;
    }

    previous.end = Math.max(previous.end, interval.end);
  }

  return mergedIntervals;
}

export async function calculateGoogleCalendarFreeMinutes(
  clientId: string,
  startTime: string,
  endTime: string,
  now = new Date()
) {
  const windowDates = getCalculationWindowDates(startTime, endTime, now);

  if (!windowDates) {
    throw new Error("Enter a valid start and end time, with start before end.");
  }

  if (windowDates.start.getTime() >= windowDates.end.getTime()) {
    return 0;
  }

  const accessToken = await getGoogleAccessToken(clientId);
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", windowDates.start.toISOString());
  url.searchParams.set("timeMax", windowDates.end.toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("fields", "items(start,end)");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error("Calendar could not be read. Manual time entry is still available.");
  }

  const calendarResponse = (await response.json()) as GoogleCalendarResponse;
  const windowStart = windowDates.start.getTime();
  const windowEnd = windowDates.end.getTime();
  const busyIntervals =
    calendarResponse.items?.flatMap((event) => {
      if (!event.start?.dateTime || !event.end?.dateTime || event.start.date || event.end.date) {
        return [];
      }

      const eventStart = new Date(event.start.dateTime).getTime();
      const eventEnd = new Date(event.end.dateTime).getTime();

      if (Number.isNaN(eventStart) || Number.isNaN(eventEnd)) {
        return [];
      }

      const start = Math.max(windowStart, eventStart);
      const end = Math.min(windowEnd, eventEnd);

      return end > start ? [{ start, end }] : [];
    }) ?? [];
  const busyMinutes = mergeBusyIntervals(busyIntervals).reduce(
    (total, interval) => total + Math.round((interval.end - interval.start) / 60000),
    0
  );
  const totalWindowMinutes = Math.round((windowEnd - windowStart) / 60000);

  return roundDownToNearestFive(Math.max(0, totalWindowMinutes - busyMinutes));
}
