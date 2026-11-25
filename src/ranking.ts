import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  collection,
  runTransaction,
  getDocsFromServer,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import type { Save } from './model';

const config = import.meta.env.VITE_FIREBASE_CONFIG;
const local = !config && import.meta.env.DEV;
function connect() {
  if (!config && !local) throw Error('온라인 랭킹 연결 설정이 필요합니다.');
  const app = initializeApp(
    config
      ? JSON.parse(config)
      : { apiKey: 'demo-local', projectId: 'demo-abyss', appId: 'demo-abyss-web' },
  );
  const auth = getAuth(app),
    db = getFirestore(app);
  if (local) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8180);
  }
  return { auth, db };
}
let service: ReturnType<typeof connect> | undefined;
async function session() {
  const { auth, db } = (service ??= connect());
  await auth.authStateReady();
  const user = auth.currentUser ?? (await signInAnonymously(auth)).user;
  return { db, uid: user.uid };
}
export async function showLeaderboard(body: HTMLElement, state: Save) {
  const panel = document.createElement('section');
  body.replaceChildren(panel);
  panel.className = 'leaderboard';
  panel.innerHTML =
    '<label>선장 이름 <input maxlength="16" placeholder="1~16자" /></label><button class="upgrade">내 기록 등록</button><p role="status"></p><ol></ol>';
  const status = panel.querySelector('p')!,
    list = panel.querySelector('ol')!,
    button = panel.querySelector('button')!,
    input = panel.querySelector('input')!;
  const bosses = state.bosses.filter(Boolean).length,
    survey = Math.min(
      999999,
      state.survey.reduce((a, b) => a + b, 0),
    ),
    score = bosses * 1000000 + survey;
  async function refresh(submit: boolean) {
    button.disabled = true;
    status.textContent = '랭킹 연결 중…';
    try {
      const name = input.value.trim();
      if (submit && !name) {
        status.textContent = '선장 이름을 입력해 주세요.';
        return;
      }
      const { db, uid } = await session();
      let kept = false;
      if (submit) {
        const ref = doc(db, 'captains', uid);
        kept = await runTransaction(db, async (transaction) => {
          const old = await transaction.get(ref);
          if (old.exists() && old.data().score > score) return true;
          transaction.set(ref, { name, bosses, survey, score });
          return false;
        });
      }
      const rows = await getDocsFromServer(
        query(collection(db, 'captains'), orderBy('score', 'desc'), limit(50)),
      );
      list.replaceChildren();
      for (const row of rows.docs) {
        const d = row.data(),
          item = document.createElement('li');
        item.textContent = `${d.name}${row.id === uid ? ' (나)' : ''} · 보스 ${d.bosses} · 조사 ${d.survey}마리`;
        list.append(item);
      }
      status.textContent =
        (local ? '로컬 Firebase · ' : '') +
        (kept
          ? '기존 최고 기록을 유지했습니다.'
          : rows.empty
            ? '첫 기록을 등록해 보세요.'
            : submit
              ? '최고 기록을 등록했습니다.'
              : '상위 50명');
    } catch {
      status.textContent = local
        ? '로컬 랭킹을 열려면 별도 터미널에서 pnpm ranking을 실행한 뒤 다시 열어 주세요.'
        : '랭킹 연결을 확인해 주세요. 낚시 기록은 브라우저에 보관됩니다.';
    } finally {
      button.disabled = false;
    }
  }
  if (!config && !local) {
    input.disabled = true;
    button.disabled = true;
    status.textContent =
      '이 비공개 게임의 랭킹 서버는 아직 연결되지 않았습니다. PC 프로젝트에서 pnpm ranking으로 로컬 순위표를 열 수 있습니다.';
    return;
  }
  button.onclick = () => void refresh(true);
  await refresh(false);
}
