# 🔧 แก้ไข Rules of Hooks Violation

## ❌ **ปัญหาเดิม:**
```javascript
// App.js - ผิด: เรียก Hook แบบ conditional
export default function App() {
  const user = useAuthUser();
  const onlineStatus = user ? useOnlineStatus() : null; // ❌ Conditional Hook
}
```

**ปัญหา:**
- การเรียก Hook แบบ conditional ทำให้ลำดับ Hook ไม่คงที่
- อาจทำให้ React Hook state เสียหาย
- ละเมิด Rules of Hooks

---

## ✅ **การแก้ไข:**

### **1. App.js - เรียก Hook เสมอ:**
```javascript
export default function App() {
  const user = useAuthUser();
  const onlineStatus = useOnlineStatus(user); // ✅ เรียกเสมอ, ส่ง user เป็น parameter
  
  const handleLogout = async () => {
    if (onlineStatus?.setOffline) {
      await onlineStatus.setOffline();
    }
    // ... logout logic
  };
}
```

### **2. useOnlineStatus Hook - จัดการ condition ภายใน:**
```javascript
export function useOnlineStatus(user = null) {
  const intervalRef = useRef(null);
  const sessionIdRef = useRef(null);
  const isActiveRef = useRef(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    // ✅ ตรวจสอบ user ภายใน useEffect
    if (!user) {
      return; // หยุดการทำงานถ้าไม่มี user
    }

    // ... heartbeat logic เมื่อมี user
    
  }, [user]); // ✅ dependency array มี user

  return {
    sessionId: sessionIdRef.current,
    setOffline: user ? setOffline : null // ✅ ส่งคืน null ถ้าไม่มี user
  };
}
```

---

## 🎯 **ผลลัพธ์:**

### **✅ ข้อดีของการแก้ไข:**
1. **Rules of Hooks Compliance**: เรียก Hook เสมอในลำดับเดียวกัน
2. **Predictable Behavior**: พฤติกรรมของ Hook คาดเดาได้
3. **No State Corruption**: ไม่มีการเสียหายของ React state
4. **Better Performance**: ไม่มี unnecessary re-renders
5. **Cleaner Code**: โค้ดอ่านง่ายและบำรุงรักษาได้ดี

### **🔄 การทำงาน:**
- **เมื่อไม่มี user**: Hook ทำงานแต่ไม่ส่ง heartbeat
- **เมื่อมี user**: Hook เริ่มส่ง heartbeat และ tracking
- **เมื่อ logout**: Hook หยุดทำงานและส่งสถานะออฟไลน์

---

## 📚 **Rules of Hooks ที่ต้องจำ:**

### **1. เรียก Hook ที่ระดับบนสุดเท่านั้น**
```javascript
// ❌ ผิด
function MyComponent() {
  if (condition) {
    const [state, setState] = useState(); // ❌ Conditional Hook
  }
}

// ✅ ถูก
function MyComponent() {
  const [state, setState] = useState(); // ✅ Top level
  
  if (condition) {
    // ใช้ state ที่นี่
  }
}
```

### **2. เรียก Hook ในลำดับเดียวกันเสมอ**
```javascript
// ❌ ผิด
function MyComponent() {
  const [name, setName] = useState();
  
  if (condition) {
    const [age, setAge] = useState(); // ❌ ลำดับไม่คงที่
  }
  
  const [email, setEmail] = useState();
}

// ✅ ถูก
function MyComponent() {
  const [name, setName] = useState();
  const [age, setAge] = useState(); // ✅ ลำดับคงที่
  const [email, setEmail] = useState();
  
  // ใช้ condition ภายใน component
}
```

### **3. เรียก Hook ใน React Functions เท่านั้น**
```javascript
// ❌ ผิด
function regularFunction() {
  const [state, setState] = useState(); // ❌ ไม่ใช่ React component
}

// ✅ ถูก
function MyComponent() {
  const [state, setState] = useState(); // ✅ React component
}

function useMyHook() {
  const [state, setState] = useState(); // ✅ Custom Hook
}
```

---

## 🧪 **การทดสอบ:**

### **Test Case 1: ไม่มี user**
```javascript
const result = useOnlineStatus(null);
// Expected: { sessionId: null, setOffline: null }
```

### **Test Case 2: มี user**
```javascript
const user = { id: 1, name: 'John' };
const result = useOnlineStatus(user);
// Expected: { sessionId: 'session_...', setOffline: function }
```

### **Test Case 3: User เปลี่ยน**
```javascript
// เริ่มต้นไม่มี user
const result1 = useOnlineStatus(null);

// หลัง login มี user
const result2 = useOnlineStatus(user);
// Expected: เริ่มส่ง heartbeat
```

---

## 📝 **สรุป:**

การแก้ไข Rules of Hooks violation นี้ทำให้:
- ✅ โค้ดปฏิบัติตาม React best practices
- ✅ ไม่มี warning ใน console
- ✅ พฤติกรรมของ Hook คาดเดาได้
- ✅ ประสิทธิภาพดีขึ้น
- ✅ ง่ายต่อการ debug และ maintain

**หลักการสำคัญ**: เรียก Hook เสมอ แต่ใช้ condition ภายใน Hook เพื่อควบคุมพฤติกรรม