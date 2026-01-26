# AOW Job Application Platform - Entity Relationship Diagram

## 🗂️ Mermaid ERD (สำหรับ GitHub/Markdown Viewers)

```mermaid
erDiagram
    USER {
        ObjectId _id PK
        string name
        string email UK "unique"
        string password
        enum role "jobseeker|employer|admin"
        boolean isActive
        object profile
        string socialProvider
        string socialId
        string avatar
        boolean isEmailVerified
        boolean isSuspended
        boolean requiresReview
        object emailValidation
        date createdAt
        date updatedAt
    }
    
    JOB {
        ObjectId _id PK
        string title
        string company
        string salary
        string location
        string type
        string category
        string jobCode
        ObjectId createdBy FK
        boolean isCompleted
        boolean isPaid
        string packageType
        boolean isActive
        date expiresAt
        string description
        array skills
        date createdAt
        date updatedAt
    }
    
    APPLICATION {
        ObjectId _id PK
        ObjectId job FK
        ObjectId applicant FK
        string jobTitle
        string jobCode
        string applicantName
        string applicantEmail
        string message
        string resumePath
        string idCardPath
        boolean idVerified
        enum status "pending|hired|rejected"
        string applicationId UK
        date createdAt
        date updatedAt
    }
    
    PAYMENT {
        ObjectId _id PK
        string paymentId UK
        ObjectId jobId FK
        ObjectId employerId FK
        number serviceFee
        string currency
        enum paymentMethod "promptpay|bank_transfer|credit_card"
        enum status "pending|paid|failed|expired|cancelled"
        boolean isAutoVerified
        object gatewayResponse
        date paidAt
        date expiresAt
        object servicePackage
        object feeBreakdown
        date createdAt
        date updatedAt
    }
    
    CHATTHREAD {
        ObjectId _id PK
        ObjectId job FK
        ObjectId employer FK
        ObjectId worker FK
        array participants
        string lastMessage
        date lastMessageAt
        boolean isAdminThread
        string title
        date createdAt
        date updatedAt
    }
    
    CHATMESSAGE {
        ObjectId _id PK
        ObjectId thread FK
        ObjectId sender FK
        string senderName
        string text
        date createdAt
        date updatedAt
    }
    
    REVIEW {
        ObjectId _id PK
        ObjectId job FK
        ObjectId user FK
        string userName
        number rating "1-5"
        string comment
        date createdAt
        date updatedAt
    }
    
    ONLINESTATUS {
        ObjectId _id PK
        ObjectId userId FK UK
        string userEmail
        string userName
        enum userRole "jobseeker|employer|admin"
        boolean isOnline
        string sessionId
        date lastActivity
        date lastSeen
        string ipAddress
        string userAgent
        object deviceInfo
        string currentPage
        date sessionStart
        date createdAt
        date updatedAt
    }

    %% Relationships
    USER ||--o{ JOB : "creates"
    USER ||--o{ APPLICATION : "applies"
    USER ||--o{ PAYMENT : "pays"
    USER ||--o{ REVIEW : "writes"
    USER ||--|| ONLINESTATUS : "has"
    USER ||--o{ CHATTHREAD : "participates"
    USER ||--o{ CHATMESSAGE : "sends"
    
    JOB ||--o{ APPLICATION : "receives"
    JOB ||--o{ PAYMENT : "requires"
    JOB ||--o{ REVIEW : "gets"
    JOB ||--o{ CHATTHREAD : "discusses"
    
    CHATTHREAD ||--o{ CHATMESSAGE : "contains"
```

---

## 📋 **Enhanced Text-Based ERD**

```
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                              AOW Job Platform - ERD                              ║
╚═══════════════════════════════════════════════════════════════════════════════════╝

                                    ╔═════════════════╗
                                    ║      USER       ║
                                    ╠═════════════════╣
                                    ║ _id (PK)        ║
                                    ║ name            ║
                                    ║ email (UNIQUE)  ║
                                    ║ password        ║
                                    ║ role (ENUM)     ║
                                    ║ isActive        ║
                                    ║ profile {}      ║
                                    ║ socialProvider  ║
                                    ║ socialId        ║
                                    ║ avatar          ║
                                    ║ isEmailVerified ║
                                    ║ isSuspended     ║
                                    ║ requiresReview  ║
                                    ║ emailValidation ║
                                    ║ createdAt       ║
                                    ║ updatedAt       ║
                                    ╚═════════════════╝
                                            ║
                        ╔═══════════════════╬═══════════════════╗
                        ║                   ║                   ║
                        ▼                   ▼                   ▼
            ╔═════════════════╗ ╔═════════════════╗ ╔═════════════════╗
            ║      JOB        ║ ║   APPLICATION   ║ ║   ONLINESTATUS  ║
            ╠═════════════════╣ ╠═════════════════╣ ╠═════════════════╣
            ║ _id (PK)        ║ ║ _id (PK)        ║ ║ _id (PK)        ║
            ║ title           ║ ║ job (FK)        ║ ║ userId (FK)     ║
            ║ company         ║ ║ applicant (FK)  ║ ║ userEmail       ║
            ║ salary          ║ ║ jobTitle        ║ ║ userName        ║
            ║ location        ║ ║ jobCode         ║ ║ userRole        ║
            ║ type            ║ ║ applicantName   ║ ║ isOnline        ║
            ║ category        ║ ║ applicantEmail  ║ ║ sessionId       ║
            ║ jobCode         ║ ║ message         ║ ║ lastActivity    ║
            ║ createdBy (FK)  ║ ║ resumePath      ║ ║ lastSeen        ║
            ║ isCompleted     ║ ║ idCardPath      ║ ║ ipAddress       ║
            ║ isPaid          ║ ║ idVerified      ║ ║ userAgent       ║
            ║ packageType     ║ ║ status (ENUM)   ║ ║ deviceInfo      ║
            ║ isActive        ║ ║ applicationId   ║ ║ currentPage     ║
            ║ expiresAt       ║ ║ createdAt       ║ ║ sessionStart    ║
            ║ description     ║ ║ updatedAt       ║ ║ createdAt       ║
            ║ skills []       ║ ╚═════════════════╝ ║ updatedAt       ║
            ║ createdAt       ║                     ╚═════════════════╝
            ║ updatedAt       ║
            ╚═════════════════╝
                    ║
                    ▼
            ╔═════════════════╗
            ║     PAYMENT     ║
            ╠═════════════════╣
            ║ _id (PK)        ║
            ║ paymentId       ║
            ║ jobId (FK)      ║
            ║ employerId (FK) ║
            ║ serviceFee      ║
            ║ currency        ║
            ║ paymentMethod   ║
            ║ status (ENUM)   ║
            ║ isAutoVerified  ║
            ║ gatewayResponse ║
            ║ paidAt          ║
            ║ expiresAt       ║
            ║ servicePackage  ║
            ║ feeBreakdown    ║
            ║ createdAt       ║
            ║ updatedAt       ║
            ╚═════════════════╝

                                    ╔═════════════════╗
                                    ║   CHATTHREAD    ║
                                    ╠═════════════════╣
                                    ║ _id (PK)        ║
                                    ║ job (FK)        ║
                                    ║ employer (FK)   ║
                                    ║ worker (FK)     ║
                                    ║ participants [] ║
                                    ║ lastMessage     ║
                                    ║ lastMessageAt   ║
                                    ║ isAdminThread   ║
                                    ║ title           ║
                                    ║ createdAt       ║
                                    ║ updatedAt       ║
                                    ╚═════════════════╝
                                            ║
                                            ▼
                                    ╔═════════════════╗
                                    ║   CHATMESSAGE   ║
                                    ╠═════════════════╣
                                    ║ _id (PK)        ║
                                    ║ thread (FK)     ║
                                    ║ sender (FK)     ║
                                    ║ senderName      ║
                                    ║ text            ║
                                    ║ createdAt       ║
                                    ║ updatedAt       ║
                                    ╚═════════════════╝

                                    ╔═════════════════╗
                                    ║     REVIEW      ║
                                    ╠═════════════════╣
                                    ║ _id (PK)        ║
                                    ║ job (FK)        ║
                                    ║ user (FK)       ║
                                    ║ userName        ║
                                    ║ rating (1-5)    ║
                                    ║ comment         ║
                                    ║ createdAt       ║
                                    ║ updatedAt       ║
                                    ╚═════════════════╝

╔═══════════════════════════════════════════════════════════════════════════════════╗
║                                 RELATIONSHIPS                                     ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║ USER (1) ────── (M) JOB           : createdBy                                    ║
║ USER (1) ────── (M) APPLICATION   : applicant                                    ║
║ JOB  (1) ────── (M) APPLICATION   : job                                          ║
║ USER (1) ────── (M) PAYMENT       : employerId                                   ║
║ JOB  (1) ────── (M) PAYMENT       : jobId                                        ║
║ USER (1) ────── (M) REVIEW        : user                                         ║
║ JOB  (1) ────── (M) REVIEW        : job                                          ║
║ USER (1) ────── (1) ONLINESTATUS  : userId                                       ║
║ USER (M) ────── (M) CHATTHREAD    : employer, worker, participants               ║
║ JOB  (1) ────── (M) CHATTHREAD    : job                                          ║
║ CHATTHREAD (1) ─ (M) CHATMESSAGE  : thread                                       ║
║ USER (1) ────── (M) CHATMESSAGE   : sender                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════╝
```

---

## 🔗 **Relationship Details**

### **Primary Relationships**

| **Parent Entity** | **Child Entity** | **Relationship Type** | **Foreign Key** | **Description** |
|-------------------|------------------|----------------------|-----------------|-----------------|
| USER | JOB | One-to-Many | createdBy | ผู้ใช้สามารถสร้างงานได้หลายงาน |
| USER | APPLICATION | One-to-Many | applicant | ผู้ใช้สามารถสมัครงานได้หลายงาน |
| JOB | APPLICATION | One-to-Many | job | งานหนึ่งมีใบสมัครได้หลายใบ |
| USER | PAYMENT | One-to-Many | employerId | นายจ้างสามารถชำระเงินได้หลายครั้ง |
| JOB | PAYMENT | One-to-Many | jobId | งานหนึ่งอาจมีการชำระเงินหลายครั้ง |
| USER | REVIEW | One-to-Many | user | ผู้ใช้สามารถเขียนรีวิวได้หลายรีวิว |
| JOB | REVIEW | One-to-Many | job | งานหนึ่งมีรีวิวได้หลายรีวิว |
| USER | ONLINESTATUS | One-to-One | userId | ผู้ใช้มีสถานะออนไลน์เพียงหนึ่งเดียว |

### **Chat System Relationships**

| **Parent Entity** | **Child Entity** | **Relationship Type** | **Foreign Key** | **Description** |
|-------------------|------------------|----------------------|-----------------|-----------------|
| USER | CHATTHREAD | Many-to-Many | employer, worker, participants | ผู้ใช้สามารถเข้าร่วมแชทได้หลายห้อง |
| JOB | CHATTHREAD | One-to-Many | job | งานหนึ่งมีห้องแชทได้หลายห้อง |
| CHATTHREAD | CHATMESSAGE | One-to-Many | thread | ห้องแชทหนึ่งมีข้อความได้หลายข้อความ |
| USER | CHATMESSAGE | One-to-Many | sender | ผู้ใช้สามารถส่งข้อความได้หลายข้อความ |

---

## 📊 **Entity Descriptions**

### **🧑‍💼 USER Entity**
- **Purpose**: เก็บข้อมูลผู้ใช้งานทั้งหมด (ผู้หางาน, นายจ้าง, แอดมิน)
- **Key Features**: Social login, Email verification, Security monitoring
- **Indexes**: email (unique), role, isActive

### **💼 JOB Entity**
- **Purpose**: เก็บข้อมูลตำแหน่งงานที่นายจ้างโพสต์
- **Key Features**: Payment integration, Expiration system, Package types
- **Indexes**: createdBy, isActive, expiresAt, jobCode

### **📝 APPLICATION Entity**
- **Purpose**: เก็บข้อมูลการสมัครงานของผู้หางาน
- **Key Features**: File uploads, ID verification, Status tracking
- **Indexes**: job + applicant (unique), applicationId, status

### **💳 PAYMENT Entity**
- **Purpose**: เก็บข้อมูลการชำระค่าธรรมเนียมบริการ
- **Key Features**: Multiple payment methods, Auto verification, Fee breakdown
- **Indexes**: paymentId (unique), employerId, status

### **💬 CHATTHREAD Entity**
- **Purpose**: เก็บข้อมูลห้องแชทระหว่างผู้ใช้
- **Key Features**: Job-based chats, Admin support, Multi-participant
- **Indexes**: job, employer, worker, participants

### **📨 CHATMESSAGE Entity**
- **Purpose**: เก็บข้อความในแต่ละห้องแชท
- **Key Features**: Real-time messaging, Sender tracking
- **Indexes**: thread, sender, createdAt

### **⭐ REVIEW Entity**
- **Purpose**: เก็บรีวิวและคะแนนของบริษัท/งาน
- **Key Features**: Rating system, Comment moderation
- **Indexes**: job, user, rating

### **🟢 ONLINESTATUS Entity**
- **Purpose**: ติดตามสถานะออนไลน์ของผู้ใช้
- **Key Features**: Real-time tracking, Session management, Device info
- **Indexes**: userId (unique), isOnline, lastActivity

---

**📅 Created**: January 2026  
**🔧 Version**: 1.0.0  
**📋 Status**: Complete ERD Documentation