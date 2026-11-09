import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "react-email";
import * as React from "react";

interface VerificationEmailProps {
  companyName: string;
  name: string;
  url: string;
}

export const VerificationEmail = ({
  companyName = "Tu App",
  name = "Usuario",
  url = "https://example.com/verify",
}: VerificationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Verifica tu correo electrónico</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans px-2">
          <Container className="border border-solid border-[#eaeaea] rounded my-10 mx-auto p-5 max-w-116.25">
            <Heading className="text-black text-[24px] font-normal text-center p-0 my-7.5 mx-0">
              Verifica tu correo electrónico
            </Heading>
            <Text className="text-black text-[14px] leading-6">
              Hola {name},
            </Text>
            <Text className="text-black text-[14px] leading-6">
              Gracias por registrarte en {companyName}. Para completar tu
              registro y acceder a tu cuenta, por favor verifica tu correo
              electrónico haciendo clic en el botón de abajo.
            </Text>
            <Section className="text-center mt-8 mb-8">
              <Button
                className="bg-[#000000] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                href={url}
              >
                Verificar correo
              </Button>
            </Section>
            <Text className="text-black text-[14px] leading-6">
              Si no creaste una cuenta en {companyName}, puedes ignorar este
              correo de forma segura.
            </Text>
            <Text className="text-[#666666] text-[12px] leading-6">
              Este enlace expirará en 24 horas.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default VerificationEmail;
