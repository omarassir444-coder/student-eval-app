// ==========================================
// 🔥 إعدادات Firebase - Firestore
// ==========================================
// استبدل القيم التالية ببيانات مشروعك من Firebase Console
// https://console.firebase.google.com/

const firebaseConfig = {
    apiKey: "AIzaSyD-oXoIbCpHEbuJ5-jR6a_0Js6r_NPjQcQ",
    authDomain: "rwaiyh-app-10bc2.firebaseapp.com",
    projectId: "rwaiyh-app-10bc2",
    storageBucket: "rwaiyh-app-10bc2.firebasestorage.app",
    messagingSenderId: "1084231796348",
    appId: "1:1084231796348:web:942a0136bb281746f5abf9"
};

// تهيئة Firebase (الإصدار 9 الموحد)
const app = firebase.initializeApp(firebaseConfig);
const dbFirestore = firebase.firestore();
const clearLocalFirestoreCache = dbFirestore.clearPersistence().catch((err) => {
    console.warn('تعذّر مسح نسخة Firestore المحلية:', err);
});
const classesRef = dbFirestore.collection('classes');
const studentsRef = dbFirestore.collection('students');
const evaluationsRef = dbFirestore.collection('evaluations');

// ==========================================
// 🔄 طبقة الوصول لقاعدة البيانات (Firestore فقط)
// ==========================================
// لا تُعرض البيانات المحلية؛ ننتظر تأكيد الخادم.

const DB = {
    // ----- الفصول (اشتراك مباشر بالتحديثات اللحظية) -----
    subscribeClasses(onChange, onError) {
        return clearLocalFirestoreCache.then(() => classesRef.onSnapshot(
            { includeMetadataChanges: true },
            snapshot => {
                if (!snapshot.metadata.fromCache) {
                    onChange(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                }
            },
            err => { console.error('❌ فشل الاشتراك في الفصول', err); if (onError) onError(err); }
        )).catch(err => { if (onError) onError(err); });
    },

    async addClass(cls) {
        await clearLocalFirestoreCache;
        const docRef = await classesRef.add(cls);
        return docRef.id;
    },

    async deleteClass(classId) {
        await clearLocalFirestoreCache;
        // حذف كل الطلاب والتقييمات المرتبطة بالفصل أولاً
        const studentsSnap = await studentsRef.where('classId', '==', classId).get({ source: 'server' });
        const batch = dbFirestore.batch();
        studentsSnap.docs.forEach(doc => {
            batch.delete(doc.ref);
            batch.delete(evaluationsRef.doc(doc.id));
        });
        batch.delete(classesRef.doc(classId));
        await batch.commit();
    },

    // ----- الطلاب (اشتراك مباشر بجميع الطلاب في كل الفصول) -----
    subscribeStudents(onChange, onError) {
        return clearLocalFirestoreCache.then(() => studentsRef.onSnapshot(
            { includeMetadataChanges: true },
            snapshot => {
                if (!snapshot.metadata.fromCache) {
                    onChange(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                }
            },
            err => { console.error('❌ فشل الاشتراك في الطلاب', err); if (onError) onError(err); }
        )).catch(err => { if (onError) onError(err); });
    },

    async addStudent(student) {
        await clearLocalFirestoreCache;
        const docRef = await studentsRef.add(student);
        return docRef.id;
    },

    async updateStudent(studentId, data) {
        await clearLocalFirestoreCache;
        await studentsRef.doc(studentId).update(data);
    },

    async deleteStudent(studentId) {
        await clearLocalFirestoreCache;
        await studentsRef.doc(studentId).delete();
        await evaluationsRef.doc(studentId).delete();
    },

    // ----- التقييمات -----
    async getEvaluation(studentId) {
        await clearLocalFirestoreCache;
        const doc = await evaluationsRef.doc(studentId).get({ source: 'server' });
        return doc.exists ? doc.data() : {};
    },

    async saveEvaluation(studentId, evaluationData) {
        await clearLocalFirestoreCache;
        await evaluationsRef.doc(studentId).set(evaluationData, { merge: true });
    }
};

console.log('✅ Firebase Firestore تم التهيئة بنجاح');
