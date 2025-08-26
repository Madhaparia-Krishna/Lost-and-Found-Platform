# Lost@Campus Mobile Mockups

Interactive Android-style mobile mockups that replicate the React website's functionality with a native mobile app feel.

## 📱 Overview

This project contains a complete set of mobile mockups for the Lost@Campus platform, built with static HTML, CSS, and JavaScript. The mockups replicate the same flow, UI, and theme as the original React website while providing a mobile-first Android-style experience.

## 🎨 Design Features

### Theme & Styling
- **Color Scheme**: Extracted from the original React website
  - Primary: `#E98074` (Coral/salmon)
  - Secondary: `#D8C3A5` (Beige/tan)
  - Success: `#8E8D8A` (Gray)
  - Danger: `#E85A4F` (Darker coral/red)
  - Background: `#EAE7DC` (Light beige)

### Mobile-First Design
- **Width**: 412px (Android standard)
- **Status Bar**: Includes time, battery, signal indicators
- **App Bar**: Material Design navigation with back buttons
- **Cards**: Elevated material design cards with shadows
- **Typography**: Roboto font family for Android feel
- **Animations**: Smooth transitions and hover effects

## 📄 Pages Included

### 1. Welcome Page (`welcome.html`)
- Hero section with platform introduction
- Feature cards explaining how the system works
- Call-to-action buttons for login/registration
- Footer with links

### 2. Authentication Page (`auth.html`)
- **Login Form**: Email and password with validation
- **Registration Form**: Full name, email, password, confirm password
- **Toggle Functionality**: Switch between login and register
- **Real-time Validation**: Field-level error checking
- **Loading States**: Animated spinners during submission

### 3. Dashboard (`dashboard.html`)
- **User Profile Header**: Avatar, name, role badge
- **Quick Actions**: Report lost/found items
- **Statistics Cards**: Real-time counts of items
- **Tabbed Interface**: Lost Items, Found Items, My Items
- **Item Cards**: Detailed item display with metadata
- **Bottom Navigation**: Home, Report, Search, Profile
- **Role-based Access**: Admin/Security shortcuts for privileged users

### 4. Found Item Form (`found-form.html`)
- **Form Fields**: Title, category, subcategory, location, date, description
- **Image Upload**: Drag-and-drop with preview
- **Dynamic Fields**: Electronics subcategory appears conditionally
- **Validation**: Required field checking and file type validation
- **Success Feedback**: Confirmation messages and redirects

### 5. Lost Item Form (`lost-form.html`)
- **Similar Structure**: Matches found form but with "lost" theming
- **Date Restrictions**: Cannot select future dates
- **Red Theming**: Uses danger colors for lost items
- **Form Persistence**: Maintains data during session

### 6. Profile Page (`profile.html`)
- **Profile Header**: Large avatar and user information
- **Role-based Panels**: Admin/Security access buttons
- **Editable Fields**: Name, admission number, faculty, year, phone
- **Read-only Email**: Security measure
- **Working Sign-out**: Clears session and redirects to auth
- **Form Validation**: Real-time field validation

### 7. Security Dashboard (`security-dashboard.html`)
- **Access Control**: Only accessible to security/admin users
- **Statistics Overview**: Pending, approved, active items
- **Action Cards**: Item approval, claim management, user verification
- **Pending Items List**: Interactive approve/reject buttons
- **Real-time Updates**: Items disappear when acted upon

### 8. Admin Dashboard (`admin-dashboard.html`)
- **Admin-only Access**: Restricted to administrator accounts
- **System Statistics**: User counts, item counts, reports
- **Management Actions**: User management, item management, logs
- **Quick Actions**: System notifications, reports, user creation
- **Access Denied**: Shows error for non-admin users

## 🔧 Technical Implementation

### Shared Files

#### `shared-styles.css`
- **CSS Variables**: Consistent color scheme and spacing
- **Component Styles**: Reusable button, form, card styles
- **Mobile Layout**: Android Material Design patterns
- **Responsive Design**: Optimized for mobile viewport
- **Animations**: Smooth transitions and micro-interactions

#### `shared-scripts.js`
- **MobileApp Class**: Central state management
- **Navigation System**: Page routing and authentication checks
- **Form Handling**: Automatic form processing and validation
- **State Persistence**: localStorage for user sessions and data
- **Dummy Data**: Pre-populated items for demonstration
- **UI Helpers**: Message system, loading states, error handling

### Key Features

#### Authentication System
```javascript
// Login with any email/password combination
// Auto-role assignment based on email:
// - admin@example.com → admin role
// - security@example.com → security role
// - any other email → user role
```

#### State Management
- **User Sessions**: Persistent login across page reloads
- **Item Storage**: Lost and found items stored locally
- **Form Data**: Temporary storage during form completion
- **Navigation State**: Back button and page history

#### Interactive Elements
- **Working Forms**: All forms process data and show feedback
- **Real-time Validation**: Immediate field-level error checking
- **Loading States**: Spinners and disabled states during processing
- **Success Messages**: Toast notifications for user actions
- **Responsive Interactions**: Hover effects and touch feedback

## 🚀 Getting Started

### Quick Start
1. Open any HTML file in a modern web browser
2. Start with `welcome.html` for the full experience
3. Navigate through the app using the built-in navigation

### Test Accounts
Create accounts with these email patterns for different roles:

**Admin Access:**
- Email: `admin@example.com`
- Password: `any password`
- Access: All features + Admin Dashboard

**Security Access:**
- Email: `security@example.com`
- Password: `any password`
- Access: All features + Security Dashboard

**Regular User:**
- Email: `any other email`
- Password: `any password`
- Access: Standard user features

### Dummy Data
The app comes pre-loaded with:
- **4 Lost Items**: iPhone, wallet, water bottle, charger
- **4 Found Items**: Keys, backpack, student ID, earbuds
- **Statistics**: Realistic counts for dashboard displays

## 📱 Mobile Experience

### Android Material Design
- **Status Bar**: Realistic mobile status indicators
- **App Bars**: Proper navigation with back buttons
- **Cards**: Elevated surfaces with appropriate shadows
- **Buttons**: Material Design button styles and states
- **Forms**: Mobile-optimized input fields and selectors

### Touch Interactions
- **Tap Targets**: Minimum 44px touch targets
- **Feedback**: Visual feedback for all interactive elements
- **Gestures**: Drag-and-drop for image uploads
- **Animations**: Smooth transitions between states

### Performance
- **Static Assets**: No external dependencies except Font Awesome
- **Optimized CSS**: Efficient selectors and minimal reflows
- **Lazy Loading**: Content loads on demand
- **Local Storage**: Fast data access without network requests

## 🎯 User Flows

### New User Registration
1. `welcome.html` → Login/Register buttons
2. `auth.html` → Toggle to register form
3. Fill registration form → Auto-login
4. `dashboard.html` → Full access to platform

### Reporting Lost Item
1. `dashboard.html` → "Report Lost" button
2. `lost-form.html` → Fill item details
3. Submit form → Success message
4. Return to dashboard → Item appears in "My Items"

### Security Approval Process
1. Login as security user
2. `dashboard.html` → "Security" button
3. `security-dashboard.html` → View pending items
4. Approve/reject items → Real-time updates

## 🔒 Security Features

- **Role-based Access**: Different interfaces for different user types
- **Authentication Checks**: Protected routes redirect to login
- **Input Validation**: XSS prevention through form validation
- **Session Management**: Secure logout functionality
- **Access Denied Pages**: Proper error handling for unauthorized access

## 📊 Data Structure

### User Object
```javascript
{
  id: 1,
  name: "User Name",
  email: "user@example.com",
  role: "user|security|admin",
  admission_number: "ST/2021/001",
  faculty_school: "School of Engineering",
  year_of_study: "3",
  phone_number: "+254 700 123 456"
}
```

### Item Object
```javascript
{
  id: 1,
  title: "Item Name",
  category: "Electronics",
  subcategory: "Phones",
  location: "Library",
  date: "2024-01-15",
  description: "Item description",
  status: "lost|found",
  userId: 1,
  reporterName: "Reporter Name",
  isApproved: true,
  createdAt: "2024-01-15T10:00:00Z"
}
```

## 🎨 Customization

### Colors
Modify CSS variables in `shared-styles.css`:
```css
:root {
  --primary-color: #E98074;
  --secondary-color: #D8C3A5;
  --danger-color: #E85A4F;
  /* ... other colors */
}
```

### Branding
- Update logo references in HTML files
- Modify app name in titles and headers
- Customize footer links and content

### Features
- Add new form fields in form pages
- Extend user roles in `shared-scripts.js`
- Create additional dashboard widgets

## 🌟 Extra Features

### Status Bar
- **Realistic Time**: Updates every minute
- **Battery Indicator**: Static but visually accurate
- **Signal Strength**: Consistent across all pages

### Notifications
- **Toast Messages**: Temporary success/error notifications
- **Loading States**: Visual feedback during operations
- **Form Validation**: Real-time field-level validation

### Accessibility
- **Semantic HTML**: Proper heading structure and landmarks
- **ARIA Labels**: Screen reader compatibility
- **Keyboard Navigation**: Tab-accessible interface
- **Color Contrast**: WCAG compliant color choices

## 🔧 Technical Notes

### Browser Compatibility
- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **Mobile Browsers**: Full mobile browser support
- **JavaScript**: ES6+ features used
- **CSS**: Modern CSS features (Grid, Flexbox, Custom Properties)

### File Structure
```
mobile-mockups/
├── shared-styles.css      # Global styles and theme
├── shared-scripts.js      # JavaScript functionality
├── welcome.html          # Landing page
├── auth.html            # Login/Registration
├── dashboard.html       # Main dashboard
├── found-form.html      # Report found item
├── lost-form.html       # Report lost item
├── profile.html         # User profile
├── security-dashboard.html  # Security interface
├── admin-dashboard.html     # Admin interface
└── README.md           # This documentation
```

### Dependencies
- **Font Awesome 6.0.0**: Icons (CDN)
- **No other external dependencies**

## 📝 License

This project replicates the functionality of the Lost@Campus React website for demonstration purposes. All styling and interactions are custom-built for the mobile mockup experience.

---

**Note**: These are static mockups for demonstration. In a production environment, you would integrate with a real backend API, implement proper authentication, and add additional security measures.