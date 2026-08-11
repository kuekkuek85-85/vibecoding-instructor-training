"use client";

import { useEffect, useState } from "react";
import {
  subscribeActiveSessionId,
  subscribeParticipants,
  subscribeSession,
} from "./db";
import { firebaseConfigured } from "./firebase";
import type { Participant, SessionDoc } from "./types";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseConfigured) {
      setError(
        "Firebase 설정이 없습니다. .env.local 의 NEXT_PUBLIC_FIREBASE_* 값을 채우고 서버를 다시 시작해 주세요."
      );
      setLoading(false);
      return;
    }
    const unsub = subscribeActiveSessionId(
      (sid) => {
        setSessionId(sid);
        setLoading(false);
      },
      (e) => {
        setError(`Firestore 연결 실패: ${e.message}`);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setSession(null);
      setParticipants([]);
      return;
    }
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

  return { sessionId, session, participants, loading, error };
}

const STORAGE_KEY = "vibecoding.participant";

export function useMyParticipantId(sessionId: string | null): {
  myId: string | null;
  setMyId: (id: string | null) => void;
  ready: boolean;
} {
  const [myId, setMyIdState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setReady(false);
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as { sessionId: string; id: string }) : null;
      setMyIdState(parsed && parsed.sessionId === sessionId ? parsed.id : null);
    } catch {
      setMyIdState(null);
    }
    setReady(true);
  }, [sessionId]);

  const setMyId = (id: string | null) => {
    setMyIdState(id);
    try {
      if (id && sessionId) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessionId, id }));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* localStorage 사용 불가 환경은 무시 */
    }
  };

  return { myId, setMyId, ready };
}
