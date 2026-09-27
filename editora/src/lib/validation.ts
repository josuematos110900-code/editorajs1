import { z } from 'zod';
import { deliveryMethods, paymentMethods } from '../config/site';

const phoneRegex = /^\+?[0-9 ()-]{7,20}$/;

export const customerSchema = z.object({
  fullName: z.string().trim().min(3, 'Indique o nome completo.').max(120, 'Nome demasiado longo.'),
  email: z.string().trim().toLowerCase().email('Indique um e-mail válido.'),
  phone: z.string().trim().regex(phoneRegex, 'Indique um telefone válido, ex.: +244 923 000 000.'),
});

export const addressSchema = z.object({
  country: z.string().trim().min(2, 'Escolha o país.'),
  city: z.string().trim().min(2, 'Indique a cidade.').max(80),
  line1: z.string().trim().min(5, 'Indique a morada (rua, número, bairro).').max(200),
  line2: z.string().trim().max(200).optional(),
  postalCode: z.string().trim().max(20).optional(),
});

export const checkoutSchema = z
  .object({
    customer: customerSchema,
    deliveryMethod: z.string().refine((id) => deliveryMethods.some((m) => m.id === id), 'Escolha o método de entrega.'),
    paymentMethod: z
      .string()
      .refine((id) => paymentMethods.some((m) => m.id === id && m.enabled), 'Escolha o método de pagamento.'),
    address: addressSchema.partial(),
    items: z
      .array(z.object({ bookId: z.string().min(1), quantity: z.number().int().min(1).max(10) }))
      .min(1, 'O carrinho está vazio.'),
    acceptTerms: z.literal(true, { error: 'Aceite as condições para continuar.' }),
  })
  .superRefine((value, ctx) => {
    const method = deliveryMethods.find((m) => m.id === value.deliveryMethod);
    if (!method?.requiresAddress) return;
    const result = addressSchema.safeParse(value.address);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({ code: 'custom', message: issue.message, path: ['address', ...issue.path] });
      }
    }
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** Converte erros do zod em { "customer.email": "mensagem" } para os formulários. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.');
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export const emailSchema = z.string().trim().toLowerCase().email('Indique um e-mail válido.');
