import { HttpException } from '@nestjs/common';
import { buildLocationIndex, LOCATION_INDEX } from './locations.data';
import { LocationsService, formatShippingAddress } from './locations.service';

// Dữ liệu nhỏ để kiểm nhánh; dữ liệu thật được kiểm ở khối cuối
const small = LocationsService.withIndex(
  buildLocationIndex([
    {
      code: '01',
      name: 'Thành phố A',
      districts: [
        {
          code: '001',
          name: 'Quận 10',
          wards: [
            { code: '00001', name: 'Phường Hai' },
            { code: '00002', name: 'Phường Ba' },
          ],
        },
        {
          code: '002',
          name: 'Quận 2',
          wards: [{ code: '00003', name: 'Phường Một' }],
        },
        { code: '003', name: 'Huyện Đảo', wards: [] },
      ],
    },
    {
      code: '02',
      name: 'Tỉnh B',
      districts: [
        {
          code: '004',
          name: 'Huyện X',
          wards: [{ code: '00004', name: 'Xã Y' }],
        },
      ],
    },
  ]),
);

function errorOf(fn: () => unknown) {
  try {
    fn();
  } catch (error) {
    const ex = error as HttpException;
    const body = ex.getResponse() as { message: string; code: string };
    return { status: ex.getStatus(), ...body };
  }
  throw new Error('Kỳ vọng ném lỗi');
}

describe('LocationsService (dữ liệu nhỏ)', () => {
  it('provinces/districts/wards đúng thứ tự cha-con', () => {
    expect(small.getProvinces().map((p) => p.code)).toEqual(['01', '02']);
    expect(small.getDistricts('01').map((d) => d.code)).toEqual([
      '003', // Huyện Đảo
      '002', // Quận 2
      '001', // Quận 10
    ]);
    expect(small.getWards('001').map((w) => w.code)).toEqual([
      '00002',
      '00001',
    ]);
  });

  it('sắp xếp tiếng Việt có số: "Quận 2" trước "Quận 10"', () => {
    const names = small.getDistricts('01').map((d) => d.name);
    expect(names.indexOf('Quận 2')).toBeLessThan(names.indexOf('Quận 10'));
  });

  it('mỗi phần tử chỉ có code và name', () => {
    expect(Object.keys(small.getProvinces()[0]).sort()).toEqual([
      'code',
      'name',
    ]);
  });

  it('mã không tồn tại → 404 có code và thông báo tiếng Việt', () => {
    expect(errorOf(() => small.getDistricts('99'))).toMatchObject({
      status: 404,
      code: 'PROVINCE_NOT_FOUND',
      message: 'Không tìm thấy tỉnh/thành phố',
    });
    expect(errorOf(() => small.getWards('999'))).toMatchObject({
      status: 404,
      code: 'DISTRICT_NOT_FOUND',
      message: 'Không tìm thấy quận/huyện',
    });
  });

  it('huyện không có phường/xã → mảng rỗng, không 404', () => {
    expect(small.getWards('003')).toEqual([]);
  });

  describe('resolveAddress', () => {
    it('hợp lệ: trả mã và tên từng cấp', () => {
      expect(small.resolveAddress('01', '001', '00001')).toEqual({
        province: { code: '01', name: 'Thành phố A' },
        district: { code: '001', name: 'Quận 10' },
        ward: { code: '00001', name: 'Phường Hai' },
      });
    });

    it('phường không thuộc quận → 400 WARD_NOT_IN_DISTRICT', () => {
      expect(
        errorOf(() => small.resolveAddress('01', '001', '00003')),
      ).toMatchObject({
        status: 400,
        code: 'WARD_NOT_IN_DISTRICT',
        message: 'Phường/xã không thuộc quận/huyện đã chọn',
      });
    });

    it('quận không thuộc tỉnh → 400 DISTRICT_NOT_IN_PROVINCE', () => {
      expect(
        errorOf(() => small.resolveAddress('02', '001', '00001')),
      ).toMatchObject({
        status: 400,
        code: 'DISTRICT_NOT_IN_PROVINCE',
      });
    });

    it('mã không tồn tại ở từng cấp → 400', () => {
      expect(
        errorOf(() => small.resolveAddress('99', '001', '00001')).code,
      ).toBe('PROVINCE_NOT_FOUND');
      expect(
        errorOf(() => small.resolveAddress('01', '999', '00001')).code,
      ).toBe('DISTRICT_NOT_FOUND');
      expect(
        errorOf(() => small.resolveAddress('01', '001', '99999')).code,
      ).toBe('WARD_NOT_FOUND');
    });

    it('huyện có phường/xã mà thiếu wardCode → 400 WARD_REQUIRED', () => {
      expect(errorOf(() => small.resolveAddress('01', '001'))).toMatchObject({
        status: 400,
        code: 'WARD_REQUIRED',
        message: 'Vui lòng chọn phường/xã',
      });
      expect(errorOf(() => small.resolveAddress('01', '001', null)).code).toBe(
        'WARD_REQUIRED',
      );
    });

    it('huyện không có phường/xã: bỏ trống thì hợp lệ, ward = null', () => {
      expect(small.resolveAddress('01', '003')).toEqual({
        province: { code: '01', name: 'Thành phố A' },
        district: { code: '003', name: 'Huyện Đảo' },
        ward: null,
      });
      expect(small.resolveAddress('01', '003', null).ward).toBeNull();
    });

    it('huyện không có phường/xã mà gửi wardCode → 400 WARD_NOT_ALLOWED', () => {
      expect(
        errorOf(() => small.resolveAddress('01', '003', '00001')),
      ).toMatchObject({
        status: 400,
        code: 'WARD_NOT_ALLOWED',
      });
    });
  });

  describe('formatShippingAddress', () => {
    it('ghép đủ các cấp', () => {
      const a = small.resolveAddress('01', '001', '00001');
      expect(formatShippingAddress('12 Lê Lợi', a)).toBe(
        '12 Lê Lợi, Phường Hai, Quận 10, Thành phố A',
      );
    });

    it('bỏ qua phường/xã khi không có', () => {
      const a = small.resolveAddress('01', '003');
      expect(formatShippingAddress('Số 1', a)).toBe(
        'Số 1, Huyện Đảo, Thành phố A',
      );
    });
  });
});

describe('dữ liệu hành chính thật (dvhcvn v20250301)', () => {
  const real = new LocationsService();

  it('số lượng khớp: 63 tỉnh, 696 huyện, 10.047 xã', () => {
    expect(LOCATION_INDEX.provinces).toHaveLength(63);
    expect(LOCATION_INDEX.districtByCode.size).toBe(696);
    expect(LOCATION_INDEX.wardByCode.size).toBe(10_047);
  });

  it('mỗi quận/huyện thuộc đúng một tỉnh và mỗi xã thuộc đúng một huyện (không mồ côi)', () => {
    let districts = 0;
    let wards = 0;
    for (const p of LOCATION_INDEX.provinces) {
      for (const d of p.districts) {
        districts++;
        expect(d.provinceCode).toBe(p.code);
        for (const w of d.wards) {
          wards++;
          expect(w.districtCode).toBe(d.code);
          expect(w.provinceCode).toBe(p.code);
        }
      }
    }
    expect(districts).toBe(696);
    expect(wards).toBe(10_047);
  });

  it('danh sách sắp theo tên tiếng Việt, "Quận 3/4" trước "Quận 10, 12" ở TP.HCM (Quận 2 đã nhập Thủ Đức từ 2021)', () => {
    const hcm = LOCATION_INDEX.provinces.find((p) =>
      p.name.includes('Hồ Chí Minh'),
    );
    expect(hcm).toBeDefined();
    const names = real.getDistricts(hcm!.code).map((d) => d.name);
    expect(names.indexOf('Quận 3')).toBeGreaterThanOrEqual(0);
    expect(names.indexOf('Quận 3')).toBeLessThan(names.indexOf('Quận 10'));
    expect(names.indexOf('Quận 10')).toBeLessThan(names.indexOf('Quận 12'));
    const collator = new Intl.Collator('vi', { numeric: true });
    const sorted = [...names].sort((a, b) => collator.compare(a, b));
    expect(names).toEqual(sorted);
  });

  it('5 huyện đảo không có phường/xã (theo nguồn): wards rỗng, đặt đơn bỏ trống wardCode', () => {
    for (const code of ['318', '471', '498', '536', '755']) {
      expect(real.getWards(code)).toEqual([]);
      const district = LOCATION_INDEX.districtByCode.get(code)!;
      const resolved = real.resolveAddress(district.provinceCode, code);
      expect(resolved.ward).toBeNull();
    }
  });

  it('một địa chỉ thật hợp lệ: đi từ API cha xuống con rồi resolve', () => {
    const province = real.getProvinces()[0];
    const district = real
      .getDistricts(province.code)
      .find((d) => real.getWards(d.code).length > 0)!;
    const ward = real.getWards(district.code)[0];
    const resolved = real.resolveAddress(
      province.code,
      district.code,
      ward.code,
    );
    expect(resolved.ward).toEqual(ward);
  });
});
