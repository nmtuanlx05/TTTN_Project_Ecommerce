import { ValidateBy } from 'class-validator';
import type { ValidationOptions } from 'class-validator';

// Số điện thoại di động Việt Nam: đúng 10 số, đầu 03/05/07/08/09 (không nhận +84)
export const VN_MOBILE_PHONE_REGEX = /^0(3|5|7|8|9)\d{8}$/;

// Tên constraint (isVnMobilePhone, isLocationCode) được app.setup.ts ánh xạ sang mã lỗi PHONE_INVALID, LOCATION_REQUIRED
export const IsVnMobilePhone = (options?: ValidationOptions) =>
  ValidateBy(
    {
      name: 'isVnMobilePhone',
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && VN_MOBILE_PHONE_REGEX.test(value),
        defaultMessage: () =>
          'Số điện thoại phải gồm 10 số, đầu số 03, 05, 07, 08 hoặc 09',
      },
    },
    options,
  );

// Mã đơn vị hành chính bắt buộc: chuỗi không rỗng, gồm chữ số (kiểm sự tồn tại và quan hệ cha-con ở service)
export const IsLocationCode = (label: string, options?: ValidationOptions) =>
  ValidateBy(
    {
      name: 'isLocationCode',
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && /^\d{1,10}$/.test(value),
        defaultMessage: () => `Vui lòng chọn ${label}`,
      },
    },
    options,
  );
