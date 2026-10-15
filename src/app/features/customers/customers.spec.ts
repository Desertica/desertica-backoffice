import { buildCustomerUpdate } from './customer-detail';

describe('buildCustomerUpdate', () => {
  it('trims, uppercases the country and omits empty optionals', () => {
    expect(
      buildCustomerUpdate({
        email: ' a@b.pe ',
        firstName: ' Ana',
        lastName: 'Ríos ',
        phone: ' ',
        country: 'pe',
        idDocType: 'DNI',
        idDocNumber: '',
        locale: 'es',
      }),
    ).toEqual({ email: 'a@b.pe', firstName: 'Ana', lastName: 'Ríos', country: 'PE', locale: 'es' });
  });
});
