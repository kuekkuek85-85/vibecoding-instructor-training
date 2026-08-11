"use client";

import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  EMPTY_DESIGN_DOC,
  type Participant,
  type PeerQuestion,
  type SessionDoc,
  type Subject,
} from "./types";

const ACTIVE_DOC = () => doc(db, "meta", "active");
export const sessionRef = (sid: string) => doc(db, "sessions", sid);
export const participantsRef = (sid: string) =>
  collection(db, "sessions", sid, "participants");
export const participantRef = (sid: string, pid: string) =>
  doc(db, "sessions", sid, "participants", pid);

function randomId(len = 8): string {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export function subscribeActiveSessionId(
  cb: (sessionId: string | null) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  return onSnapshot(
    ACTIVE_DOC(),
    (snap) => cb((snap.data()?.sessionId as string) ?? null),
    (e) => onError?.(e)
  );
}

export function subscribeSession(
  sid: string,
  cb: (s: SessionDoc | null) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  return onSnapshot(
    sessionRef(sid),
    (snap) => cb(snap.exists() ? (snap.data() as SessionDoc) : null),
    (e) => onError?.(e)
  );
}

export function subscribeParticipants(
  sid: string,
  cb: (list: Participant[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  return onSnapshot(
    participantsRef(sid),
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as Participant[];
      list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      cb(list);
    },
    (e) => onError?.(e)
  );
}

export interface SeedInput {
  name: string;
  subject: Subject;
}

/** 새 세션 + 참가자 4명을 만들고 meta/active 를 갱신한다. sessionId 는 랜덤 문자열. */
export async function createSession(people: SeedInput[]): Promise<string> {
  const sid = randomId(10);
  const batch = writeBatch(db);

  const session: SessionDoc = {
    currentSlide: 0,
    phase: "waiting",
    presenterId: null,
    slides: [],
    createdAt: Date.now(),
  };
  batch.set(sessionRef(sid), session);

  people.forEach((person, i) => {
    const p: Omit<Participant, "id"> = {
      name: person.name.trim() || `참가자 ${i + 1}`,
      subject: person.subject,
      order: i,
      stage: 1,
      gateApproved: false,
      seedId: null,
      designDoc: { ...EMPTY_DESIGN_DOC },
      aiReviewDesign: null,
      selfReviewDesign: null,
      peerReviewDesign: null,
      canvaLink: "",
      canvaPrompt: "",
      outputSummary: "",
      aiReviewOutput: null,
      selfReviewOutput: null,
      peerQuestions: [],
      instructorComment: "",
      takeaway: "",
    };
    batch.set(participantRef(sid, `p${i + 1}`), p);
  });

  batch.set(ACTIVE_DOC(), { sessionId: sid, updatedAt: Date.now() });
  await batch.commit();
  return sid;
}

export async function getActiveSessionId(): Promise<string | null> {
  const snap = await getDoc(ACTIVE_DOC());
  return (snap.data()?.sessionId as string) ?? null;
}

export async function setActiveSessionId(sid: string): Promise<void> {
  await setDoc(ACTIVE_DOC(), { sessionId: sid, updatedAt: Date.now() });
}

export async function patchSession(
  sid: string,
  data: Partial<SessionDoc>
): Promise<void> {
  await updateDoc(sessionRef(sid), data);
}

export async function patchParticipant(
  sid: string,
  pid: string,
  data: Record<string, unknown>
): Promise<void> {
  await updateDoc(participantRef(sid, pid), data);
}

/**
 * 검토관 질문 추가. 세 명이 동시에 제출해도 유실되지 않도록
 * 배열을 읽어 다시 쓰지 않고 arrayUnion 으로 덧붙인다.
 *
 * arrayUnion 은 객체가 완전히 같을 때만 중복을 걸러 내므로, 같은 사람이 문구를
 * 바꿔 두 번 제출하는 것까지는 막지 못한다. 그 부분은 화면에서 이미 제출한
 * 검토관에게 입력폼을 감추는 것으로 처리한다(발표 1회당 1명 1질문).
 */
export async function addPeerQuestion(
  sid: string,
  presenterId: string,
  q: PeerQuestion
): Promise<void> {
  await updateDoc(participantRef(sid, presenterId), {
    peerQuestions: arrayUnion(q),
  });
}
