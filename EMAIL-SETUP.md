s# Email Setup for Ban/Unban Notifications

This document provides instructions on how to configure email notifications for user ban and unban actions in the Lost & Found Platform.

## Configuration Steps

1. Create or update your `.env` file in the root directory with the following email configuration:

```
# Email Configuration for Nodemailer
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

2. For Gmail accounts, you need to create an App Password:
   - Go to your Google Account settings: https://myaccount.google.com/
   - Navigate to Security
   - Under "Signing in to Google", select "App passwords" (you may need to enable 2-Step Verification first)
   - Generate a new app password for "Mail" and "Other (Custom name)" - name it "Lost and Found System"
   - Copy the generated password and use it as EMAIL_PASS in your .env file

3. Restart your server after updating the .env file:
```
node server.js
```

## Testing Email Functionality

You can test if your email configuration is working correctly by running:

```
node test-nodemailer.js your-test-email@example.com
```

## Troubleshooting

If emails are not being sent:

1. Check your .env file has correct EMAIL_USER and EMAIL_PASS values
2. Ensure you're using an App Password if using Gmail
3. Check your server logs for any error messages
4. Try running the test-nodemailer.js script to verify your email configuration
5. Make sure your email provider allows sending from less secure apps

## Ban/Unban Email Templates

The system uses Nodemailer to send emails when users are banned or unbanned. The templates are defined in `server-email-nodemailer.js` and can be customized as needed.

- Ban notification: Sent when a user is banned by security or admin
- Unban notification: Sent when a user is unbanned by security or admin 