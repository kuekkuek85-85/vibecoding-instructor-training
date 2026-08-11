"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  subscribeActiveSessionId,
  subscribeParticipants,
  subscribeSession,
} from "./db";
import { firebaseConfigured } from "./firebase";
import type { Participant, SessionDoc } from "./types";

const NO_CONFIG_MSG =
  "Firebase 설정이 없습니다. .env.local 의 NEXT_PUBLIC_FIREBASE_* 값을 채우고 서버를 다시 시작해 주세요.";

export interface SessionState {
  sessionId: string | null;
  session: SessionDoc | null;
  participants: Participant[];
  loading: boolean;
  error: string | null;
}

export function useSession(): SessionState {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<SessionDoc | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(firebaseConfigured);
  const [error, setError] = useState<string | null>(
    firebaseConfigured ? null : NO_CONFIG_MSG
  );

  useEffect(() => {
    if (!firebaseConfigured) return;
    return subscribeActiveSessionId(
      (sid) => {
        setSessionId(sid);
        setLoading(false);
      },
      (e) => {
        setError(`Firestore 연결 실패: ${e.message}`);
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const unsubS = subscribeSession(sessionId, setSession, (e) =>
      setError(`세션 구독 실패: ${e.message}`)
    );
    const unsubP = subscribeParticipants(sessionId, setParticipants, (e) =>
      setError(`참가자 구독 실패: ${e.message}`)
    );
    return () => {
      unsubS();
      unsubP();
    };
  }, [sessionId]);

  // 세션이 없으면 이전 세션의 잔여 데이터를 내보내지 않는다.
  return {
    sessionId,
    session: sessionId ? session : null,
    participants: sessionId ? participants : [],
    loading,
    error,
  };
}

const STORAGE_KEY = "vibecoding.participant";

interface StoredChoice {
  sessionId: string;
  id: string;
}

/* localStorage 를 외부 스토어로 다뤄 SSR 하이드레이션과 어긋나지 않게 한다. */
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedValue: StoredChoice | null = null;

function subscribeStorage(cb: () => void): () => void {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function getStoredSnapshot(): StoredChoice | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  // 같은 문자열이면 같은 객체를 돌려줘야 무한 렌더를 피할 수 있다.
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  try {
    cachedValue = raw ? (JSON.parse(raw) as StoredChoice) : null;
  } catch {
    cachedValue = null;
  }
  return cachedValue;
}

function getServerSnapshot(): StoredChoice | null {
  return null;
}

export function useMyParticipantId(sessionId: string | null): {
  myId: string | null;
  setMyId: (id: string | null) => void;
  ready: boolean;
} {
  const stored = useSyncExternalStore(
    subscribeStorage,
    getStoredSnapshot,
    getServerSnapshot
  );

  const setMyId = (id: string | null) => {
    const next = id && sessionId ? { sessionId, id } : null;
    try {
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* localStorage 사용 불가 환경은 무시 */
    }
    listeners.forEach((l) => l());
  };

  // 세션이 바뀌면 예전 선택은 무효 — 이름 선택 화면으로 돌아간다.
  const myId = stored && stored.sessionId === sessionId ? stored.id : null;

  // sessionId 가 도착할 즈음이면 하이드레이션은 이미 끝나 있다.
  return { myId, setMyId, ready: Boolean(sessionId) };
}
