const assert = require("assert");
const sinon = require("sinon");

describe("contactForm", function() {
  it("should send email with correct details", async function() {
    const senderName = "John Doe";
    const senderEmail = "john.doe@example.com";
    const subject = "Test Subject";
    const message = "Test Message";
    const expectedHtmlContent = "<html><body>Test HTML content</body></html>";
    const expectedDetails = {
      from: '"GO EVENT! ŰRLAP" <sipos.roland@students.jedlik.eu>',
      to: "goeventhungary@gmail.com",
      subject: "Űrlapkitöltés :  Test Subject",
      html: expectedHtmlContent,
    };
    const expectedDate = "2023.05.03. 13:30";

    const getHtmlContactFormStub = sinon.stub().resolves(expectedHtmlContent);
    const createTransportStub = sinon.stub().returns({
      sendMail: sinon.stub().resolves(),
    });

    const contactForm = proxyquire("./contactForm.js", {
      "./getHtmlContactForm": getHtmlContactFormStub,
      "nodemailer": {
        createTransport: createTransportStub,
      },
    });

    await contactForm(senderName, senderEmail, subject, message);

    sinon.assert.calledWith(createTransportStub, {
      service: "gmail",
      auth: {
        user: "sipos.roland@students.jedlik.eu",
        pass: process.env.GMAIL_PW,
      },
    });
    sinon.assert.calledWith(getHtmlContactFormStub, senderName, senderEmail, subject, message, expectedDate);
    sinon.assert.calledWith(createTransportStub().sendMail, expectedDetails);
  });
});
