import { initializeApp } from 'firebase/app'
import { initializeAuth, browserSessionPersistence, browserPopupRedirectResolver } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyAI-qyt10r1E-PP6uGwKx1OaWbBXjwgg9E',
  authDomain: 'recipes-5a663.firebaseapp.com',
  projectId: 'recipes-5a663',
  storageBucket: 'recipes-5a663.firebasestorage.app',
  messagingSenderId: '347900248428',
  appId: '1:347900248428:web:cd07582a8b2f8ca1967349',
  measurementId: 'G-Z1GJ4WEEJ8',
}

const app = initializeApp(firebaseConfig)
export const auth = initializeAuth(app, {
  persistence: browserSessionPersistence,
  popupRedirectResolver: browserPopupRedirectResolver,
})
export const db = getFirestore(app)
export const storage = getStorage(app)
storage.maxUploadRetryTime = 30_000
storage.maxOperationRetryTime = 15_000
