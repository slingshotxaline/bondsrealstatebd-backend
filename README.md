# BONDS Real Estate — Backend API

Node.js + Express + MongoDB REST API with JWT auth, role-based access, file uploads, notifications, and email.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secrets, and SMTP settings

# 3. Seed superadmin
node seed.js

# 4. Start server
npm run dev        # development (needs nodemon: npm i -g nodemon)
npm start          # production
```

---

## 📁 Project Structure

```
bonds-backend/
├── server.js                  # Entry point
├── seed.js                    # Superadmin seeder
├── .env.example               # Environment template
└── src/
    ├── app.js                 # Express app config
    ├── config/
    │   ├── db.js              # MongoDB connection
    │   └── multer.js          # File upload config
    ├── models/
    │   ├── User.js            # User + Admin model
    │   ├── Property.js        # Property model
    │   ├── Inquiry.js         # Inquiry model
    │   └── Notification.js    # Notification model
    ├── controllers/
    │   ├── authController.js
    │   ├── propertyController.js
    │   ├── userController.js
    │   ├── inquiryController.js
    │   └── notificationController.js
    ├── routes/
    │   ├── auth.js
    │   ├── properties.js
    │   ├── admin.js
    │   └── user.js
    ├── middleware/
    │   ├── auth.js            # JWT protect + authorize
    │   ├── errorHandler.js    # Global error handler
    │   └── validate.js        # express-validator checker
    ├── validators/
    │   └── index.js           # All validation rules
    └── utils/
        ├── asyncHandler.js    # Async wrapper
        ├── response.js        # Helpers + AppError
        ├── email.js           # Nodemailer + templates
        └── notification.js    # In-app notifications
```

---

## 🔐 Authentication

All protected routes require: `Authorization: Bearer <token>`

---

## 📡 API Reference

### Auth — `/api/auth`

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/register` | ❌ | Register user |
| POST | `/login` | ❌ | Login (returns JWT + refresh token) |
| POST | `/refresh` | ❌ | Refresh access token |
| GET | `/me` | ✅ | Get current user profile |
| PUT | `/me` | ✅ | Update profile |
| PUT | `/change-password` | ✅ | Change password |

---

### Properties — `/api/properties`

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/` | ❌ | List approved properties (with filters) |
| GET | `/:id` | ❌ | Get single property (increments views) |
| POST | `/` | ✅ User | Submit property (multipart/form-data) |
| GET | `/my` | ✅ User | Get own properties |
| PUT | `/:id` | ✅ Owner/Admin | Update property |
| DELETE | `/:id` | ✅ Owner/Admin | Delete property |
| POST | `/:id/inquiries` | ❌/✅ | Submit inquiry |

#### Property Filters (GET `/api/properties`)
```
?listingType=Sale|Rent
&propertyType=Residential|Commercial
&propertyCategory=Apartment|House|...
&city=Dhaka
&area=Jolshiri
&minPrice=5000000
&maxPrice=20000000
&amenities=Gym&amenities=Pool
&isFeatured=true
&search=keyword
&sort=newest|oldest|price_asc|price_desc|views
&page=1&limit=10
```

#### Submit Property (POST `/api/properties`)
```
Content-Type: multipart/form-data

Fields:
  listingType       Sale | Rent  *
  propertyType      Residential | Commercial  *
  propertyCategory  Apartment | House | ...  *
  address           *
  city              *
  area              *
  title             *
  description       *
  price             *
  priceLabel        Fixed | Negotiable | On Request | Per Month | Per Year
  amenities         JSON array string e.g. '["Gym","Parking"]'
  youtubeUrl        Optional YouTube URL
  ownerName         *
  ownerEmail        *
  ownerPhone        *
  thumbnail         Image file (jpeg/jpg/png/webp, max 5MB)  *
  photos            Up to 10 image files
```

---

### Admin — `/api/admin` (Admin/Superadmin only)

#### Properties
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/properties` | All properties (all statuses + filters) |
| GET | `/properties/stats` | Counts by status and listing type |
| POST | `/properties` | Create property (auto-approved) |
| PATCH | `/properties/:id/approve` | Approve listing |
| PATCH | `/properties/:id/reject` | Reject listing (body: `{ reason }`) |
| PATCH | `/properties/:id/toggle-featured` | Toggle featured |

#### Users
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/users` | List users (`?search=&status=`) |
| GET | `/users/:id` | Get user details |
| PATCH | `/users/:id/status` | Set `active` or `suspended` |
| DELETE | `/users/:id` | Delete user |

#### Admins (Superadmin only)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/admins` | List all admins |
| POST | `/admins` | Create new admin |
| DELETE | `/admins/:id` | Remove admin |

#### Inquiries
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/inquiries` | All inquiries (`?status=&inquiryType=&propertyId=`) |
| PATCH | `/inquiries/:id` | Update status / add admin notes |

---

### User Dashboard — `/api/user` (Auth required)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/inquiries` | My submitted inquiries |
| GET | `/notifications` | My notifications |
| PATCH | `/notifications/read-all` | Mark all read |
| PATCH | `/notifications/:id/read` | Mark one read |

---

## 🗂 Roles

| Role | Permissions |
|------|------------|
| `user` | Submit/edit/delete own properties, submit inquiries, view notifications |
| `admin` | All user permissions + manage all properties, users, inquiries |
| `superadmin` | All admin permissions + manage admins |

---

## 🖼 File Uploads

- **Thumbnail**: Required, single image → `uploads/thumbnails/`
- **Photos**: Optional, up to 10 images → `uploads/photos/`
- Accessible at: `GET /uploads/thumbnails/<filename>` and `GET /uploads/photos/<filename>`
- Max size: 5MB per file
- Formats: jpeg, jpg, png, webp

---

## ⚙️ Environment Variables

```
NODE_ENV          development | production
PORT              5000
MONGO_URI         MongoDB connection string
JWT_SECRET        Access token secret
JWT_EXPIRE        e.g. 7d
JWT_REFRESH_SECRET  Refresh token secret
JWT_REFRESH_EXPIRE  e.g. 30d
SMTP_HOST         Mail server host
SMTP_PORT         465 or 587
SMTP_EMAIL        Sender email
SMTP_PASSWORD     App password
FROM_NAME         BONDS Real Estate
FROM_EMAIL        noreply@bonds.com
CLIENT_URL        http://localhost:3000
MAX_FILE_UPLOAD   5242880  (5MB)
```

---

## 🔒 Security Features

- JWT access + refresh tokens
- bcrypt password hashing (12 rounds)
- Helmet.js HTTP headers
- Rate limiting (100 req/15min; 20 auth req/15min)
- CORS configuration
- Input validation via express-validator
- Role-based access control
- File type validation
- Graceful shutdown handling
