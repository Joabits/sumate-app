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

interface ResetPasswordEmailProps {
  companyName: string;
  name: string;
  url: string;
}

export const ResetPasswordEmail = ({
  companyName = "Tu App",
  name = "Usuario",
  url = "https://example.com/reset",
}: ResetPasswordEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Restablece tu contraseña</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans px-2">
          <Container className="border border-solid border-[#eaeaea] rounded my-10 mx-auto p-5 max-w-116.25">
            <Heading className="text-black text-[24px] font-normal text-center p-0 my-7.5 mx-0">
              Restablece tu contraseña
            </Heading>
            <Text className="text-black text-[14px] leading-6">
              Hola {name},
            </Text>
            <Text className="text-black text-[14px] leading-6">
              Recibimos una solicitud para cambiar tu contraseña en{" "}
              {companyName}. Puedes hacerlo a través del siguiente botón:
            </Text>
            <Section className="text-center mt-8 mb-8">
              <Button
                className="bg-[#000000] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                href={url}
              >
                Cambiar contraseña
              </Button>
            </Section>
            <Text className="text-black text-[14px] leading-6">
              Si no solicitaste este cambio, por favor ignora este correo. Tu
              contraseña no cambiará a menos que accedas al enlace y crees una
              nueva.
            </Text>
            <Text className="text-[#666666] text-[12px] leading-6">
              Este enlace expirará en 1 hora.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default ResetPasswordEmail;
