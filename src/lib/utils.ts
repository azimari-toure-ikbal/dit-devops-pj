import OTPEmail from "~/emails/otp";
import { resend } from "./resend";

export const genRandomCode = () => {
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
};

export const genApiKey = () => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let apiKey = "";
  const charactersLength = characters.length;

  for (let i = 0; i < 32; i++) {
    const randomIndex = Math.floor(Math.random() * charactersLength);
    apiKey += characters.charAt(randomIndex);
  }

  return apiKey;
};

export const sendVerificationEmail = async (email: string, code: string) => {
  try {
    const emRes = await resend.emails.send({
      from: "dev@yeebus-test.online",
      to: [email],
      subject: "Verification code",
      react: OTPEmail({
        validationCode: code,
      }),
    });

    if (emRes.error) {
      throw new Error(emRes.error.message);
    }
  } catch (err) {
    throw new Error("Error sending verification email");
  }
};
