import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  initializeAuth,
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  browserLocalPersistence,
  indexedDBLocalPersistence,
  browserPopupRedirectResolver,
  type Auth,
  type User,
} from 'firebase/auth'
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDocFromServer,
  type Firestore,
} from 'firebase/firestore'
import firebaseConfig from '../firebase-applet-config.json'

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()

// CRITICAL: Connect directly to the provisioned database ID with persistent local cache for offline PWA support
let firestoreInstance: Firestore
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    },
    firebaseConfig.firestoreDatabaseId,
  )
} catch {
  firestoreInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId)
}
export const db: Firestore = firestoreInstance
let authInstance: Auth
try {
  if (typeof window !== 'undefined') {
    authInstance = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    })
  } else {
    authInstance = getAuth(app)
  }
} catch {
  authInstance = getAuth(app)
}

export const auth: Auth = authInstance

export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'))
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Klient offline — używanie pamięci podręcznej')
    }
  }
}

// Strictly conforms to FirestoreErrorInfo from Firebase Integration Skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string
  operationType: OperationType
  path: string | null
  authInfo: {
    userId?: string | null
    email?: string | null
    emailVerified?: boolean | null
    isAnonymous?: boolean | null
    tenantId?: string | null
    providerInfo?: {
      providerId?: string | null
      email?: string | null
    }[]
  }
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  }
  console.error('Firestore Error:', JSON.stringify(errInfo))
  throw new Error(JSON.stringify(errInfo))
}

export interface AuthErrorInfo {
  code: string
  message: string
  isUnauthorizedDomain: boolean
  isPopupBlocked: boolean
  domain: string
  projectId: string
}

export interface AuthResult {
  user: User | null
  error?: AuthErrorInfo | null
}

export async function signInWithGoogle(): Promise<AuthResult> {
  try {
    if (typeof window !== 'undefined') {
      try {
        await setPersistence(auth, indexedDBLocalPersistence)
      } catch {
        try {
          await setPersistence(auth, browserLocalPersistence)
        } catch {
          // ignore fallback error
        }
      }
    }
    const result = await signInWithPopup(auth, googleProvider)
    return { user: result.user, error: null }
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string }
    const code = error?.code || 'unknown'
    const message = error?.message || String(err)

    // User closed popup or dismissed sign-in prompt — normal user cancellation, not a failure
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return { user: null, error: null }
    }

    console.error('Błąd logowania przez Google:', code, message)

    const isUnauthorizedDomain = code === 'auth/unauthorized-domain'
    const isPopupBlocked = code === 'auth/popup-blocked'
    const domain = typeof window !== 'undefined' ? window.location.hostname : ''

    return {
      user: null,
      error: {
        code,
        message,
        isUnauthorizedDomain,
        isPopupBlocked,
        domain,
        projectId: firebaseConfig.projectId,
      },
    }
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth)
  } catch (error) {
    console.error('Błąd wylogowania:', error)
  }
}
