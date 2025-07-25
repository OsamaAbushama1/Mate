# Mate

Mate is a web platform for a clothing brand that allows users to register, log in, place orders, manage their shopping cart, and earn points through a loyalty program. Users earn 70 points for each delivered order (confirmed by an admin), and upon reaching 500 points, they receive a coupon redeemable on future orders. Users can also view their points history. Admins have full control over orders, products, users, and points, and can generate daily and monthly reports.

This repository contains both the **frontend** and **backend** codebases for the Mate platform.

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
  - [Frontend Setup](#frontend-setup)
  - [Backend Setup](#backend-setup)
- [Usage](#usage)


## Features
- **User Authentication**:
  - Register and log in with email and password validation.
  - Secure user sessions with JWT authentication.
- **Order Management**:
  - Users can browse products, add them to a cart, and place orders.
  - Admins confirm order delivery to trigger point allocation.
- **Loyalty Program**:
  - Users earn 70 points per delivered order (confirmed by admin).
  - Points accumulate, and 500 points convert to a redeemable coupon.
  - Users can view their points history in a dedicated points page.
- **Shopping Cart**:
  - Users can add, remove, or update items in their cart before checkout.
- **Admin Dashboard**:
  - Manage orders (view, update status, confirm delivery).
  - Add, edit, or delete products (e.g., clothing items with details like size, color, price).
  - View and manage users (e.g., suspend, delete accounts).
  - Monitor total points across all users.
  - Generate daily and monthly reports for orders and platform activity.
- **Coupon System**:
  - Users can redeem coupons (generated from 500 points) during checkout.

## Tech Stack
### Frontend
- **Framework**: [React.js](https://reactjs.org/)
- **State Management**: [Context API](https://reactjs.org/docs/context.html)
- **Styling**: [Bootstrap](https://getbootstrap.com/)
- **HTTP Client**: [Axios](https://axios-http.com/) for API requests
- **Routing**: [React Router](https://reactrouter.com/)

### Backend
- **Framework**: [Django](https://www.djangoproject.com/) with [Django REST Framework](https://www.django-rest-framework.org/)
- **Database**: [SQLite](https://www.sqlite.org/) for development
- **Authentication**: [JWT](https://jwt.io/) for secure user sessions
- **API**: RESTful API for communication with the frontend
- **File Storage**: Local storage for product images

## Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [npm](https://www.npmjs.com/) or [Yarn](https://yarnpkg.com/)
- [Python](https://www.python.org/) (v3.8 or higher)
- [Git](https://git-scm.com/)

### Frontend Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/OsamaAbushama1/mate.git
   cd mate/mate


Install dependencies:
npm install

or yarn install


Create a .env file in the frontend directory and add environment variables:REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_BASE_URL=http://localhost:3000


Start the development server:
npm start

or yarn start


Access the frontend at http://localhost:3000.

Backend Setup

Navigate to the backend directory:cd mate/backend



Create a .env file in the backend directory and add environment variables:SECRET_KEY=your_django_secret_key
DATABASE_URL=sqlite:///db.sqlite3
EMAIL_HOST=smtp.your-email-service.com
EMAIL_PORT=587
EMAIL_HOST_USER=your_email_user
EMAIL_HOST_PASSWORD=your_email_password


Run database migrations:python manage.py migrate


Start the Django development server:python manage.py runserver


The API will be available at http://localhost:8000/api.


Usage

User Registration/Login:
Navigate to /register or /login to create an account or sign in.
Passwords must meet secure criteria (e.g., 8+ characters, mixed case, numbers, special characters).


Browsing Products:
Visit /products to browse clothing items, filter by category, size, or color.
Add items to the cart and proceed to checkout.


Placing an Order:
From the cart (/cart), review items and place an order.
Admins must confirm delivery to allocate 70 points to the user.


Points and Coupons:
View points history at /points.
Upon reaching 500 points, a coupon is generated and can be redeemed at checkout.


Admin Dashboard:
Admins access /admin to:
Manage orders (view, update status, confirm delivery).
Add, edit, or delete products.
View and manage users (e.g., suspend, delete accounts).
Monitor total points and generate daily/monthly reports.



For any issues or questions, please open an issue on GitHub or contact us at osamaabushama1@gmail.com.```
