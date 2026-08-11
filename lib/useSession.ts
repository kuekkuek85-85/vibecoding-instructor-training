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

/**
 * 구독 데이터를 그 데이터가 속한 세션 id 와 함께 들고 다닌다.
 * 강사가 행사 도중 새 세션을 만들면 sessionId 는 즉시 바뀌지만 새 스냅샷은
 * 조금 뒤에 도착한다. 그 사이에 이전 세션의 참가자 목록을 내보내면 수강생이
 * 없는 사람을 고르거나 엉뚱한 문서에 stage 를 쓰게 된다.
 */
interface Scoped<T> {
  sid: string;
  data: T;
}

export function useSession(): SessionState {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<Scoped<SessionDoc | null> | null>(null);
  const [participants, setParticipants] = useState<Scoped<Participant[]> | null>(
    null
  );
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
    const sid = sessionId;
    const unsubS = subscribeSession(
      sid,
      (s) => setSession({ sid, data: s }),
      (e) => setError(`세션 구독 실패: ${e.message}`)
    );
    const unsubP = subscribeParticipants(
      sid,
      (list) => setParticipants({ sid, data: list }),
      (e) => setError(`참가자 구독 실패: ${e.message}`)
    );
    return () => {
      unsubS();
      unsubP();
    };
  }, [sessionId]);

  // 현재 세션의 스냅샷이 도착하기 전까지는 아무것도 내보내지 않는다.
  return {
    sessionId,
    session: session && session.sid === sessionId ? session.data : null,
    participants:
      participants && participants.sid === sessionId ? participants.data : [],
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
