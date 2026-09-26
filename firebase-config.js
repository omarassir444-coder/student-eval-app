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
const classesRef = dbFirestore.collection('classes');
const studentsRef = dbFirestore.collection('students');
const evaluationsRef = dbFirestore.collection('evaluations');

// تفعيل الدعم بدون اتصال (Offline Persistence)
dbFirestore.enablePersistence({ synchronizeTabs: true }).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn('⚠️ التزامن متعدد التبويبات غير متاح - أغلق التبويبات الأخرى');
    } else if (err.code === 'unimplemented') {
        console.warn('⚠️ المتصفح لا يدعم العمل بدون اتصال');
    }
});

// ==========================================
// 🔄 طبقة الوصول لقاعدة البيانات (Firestore فقط)
// ==========================================
// كل البيانات تُقرأ وتُكتب مباشرة من/إلى Firestore، بدون أي نسخة في localStorage

const DB = {
    // ----- الفصول (اشتراك مباشر بالتحديثات اللحظية) -----
    subscribeClasses(onChange, onError) {
        return classesRef.onSnapshot(
            snapshot => onChange(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
            err => { console.error('❌ فشل الاشتراك في الفصول', err); if (onError) onError(err); }
        );
    },

    async addClass(cls) {
        const docRef = await classesRef.add(cls);
        return docRef.id;
    },

    async deleteClass(classId) {
        // حذف كل الطلاب والتقييمات المرتبطة بالفصل أولاً
        const studentsSnap = await studentsRef.where('classId', '==', classId).get();
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
        return studentsRef.onSnapshot(
            snapshot => onChange(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
            err => { console.error('❌ فشل الاشتراك في الطلاب', err); if (onError) onError(err); }
        );
    },

    async addStudent(student) {
        const docRef = await studentsRef.add(student);
        return docRef.id;
    },

    async updateStudent(studentId, data) {
        await studentsRef.doc(studentId).update(data);
    },

    async deleteStudent(studentId) {
        await studentsRef.doc(studentId).delete();
        await evaluationsRef.doc(studentId).delete();
    },

    // ----- التقييمات -----
    async getEvaluation(studentId) {
        const doc = await evaluationsRef.doc(studentId).get();
        return doc.exists ? doc.data() : {};
    },

    async saveEvaluation(studentId, evaluationData) {
        await evaluationsRef.doc(studentId).set(evaluationData, { merge: true });
    }
};

console.log('✅ Firebase Firestore تم التهيئة بنجاح');
