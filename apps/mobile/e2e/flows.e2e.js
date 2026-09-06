describe('AfyaToken Mobile App E2E User Flow', () => {
  beforeAll(async () => {
    // Relaunch app with cleared data before full test suite
    await device.launchApp({ newInstance: true, delete: true });
  });

  it('should display the Welcome/Login screen on first load', async () => {
    await expect(element(by.text('Welcome Back'))).toBeVisible();
    await expect(element(by.text('Sign In'))).toBeVisible();
  });

  it('should show an error alert on invalid login', async () => {
    await element(by.placeholder('Enter your email')).typeText('invalid@afyaToken.ke');
    await element(by.placeholder('Enter your password')).typeText('wrongpassword123');
    
    // Dismiss keyboard mapping
    await element(by.text('Sign In')).tap();
    
    // Verify alert appears (assuming "Login Failed" is the title)
    await expect(element(by.text('Login Failed'))).toBeVisible();
    await element(by.text('OK')).tap(); // dismiss alert
  });

  it('should navigate to Register screen when tapped', async () => {
    await element(by.text('Register')).tap();
    await expect(element(by.text('Join AfyaToken'))).toBeVisible();
    await expect(element(by.placeholder('John Doe'))).toBeVisible();
  });

  it('should allow user to navigate back to login and auth successfully', async () => {
    // Tap back button or Sign In link
    await element(by.text('Sign In')).tap();
    
    // Normally we would mock the backend using mock server.
    // Assuming backend returns success for test user:
    await element(by.placeholder('Enter your email')).clearText();
    await element(by.placeholder('Enter your email')).typeText('citizen@ke.org');
    await element(by.placeholder('Enter your password')).clearText();
    await element(by.placeholder('Enter your password')).typeText('12345678');
    
    // Hide keyboard if required (iOS vs Android nuances handled natively)
    await element(by.text('Sign In')).tap();
    
    // We expect transition to Home Screen (Dashboard)
    await expect(element(by.text('Afya Yako'))).toBeVisible();
    await expect(element(by.text('YOUR AfyaToken WALLET'))).toBeVisible();
  });

  it('should navigate to Contribute screen via CTA', async () => {
    await element(by.text('+ Contribute')).tap();
    await expect(element(by.text('Add Funds'))).toBeVisible();
    await expect(element(by.text('M-PESA Number'))).toBeVisible();
  });

  it('should trigger M-PESA Daraja push simulator', async () => {
    await element(by.placeholder('0712345678')).typeText('0712345678');
    await element(by.text('Confirm KES')).tap();

    // Verify STK simulated alert pushes through
    await expect(element(by.text('Payment Initiated'))).toBeVisible();
  });
});
