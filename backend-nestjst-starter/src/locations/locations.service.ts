import { Injectable } from '@nestjs/common';
import { badRequest, notFound } from '../common/errors/coded-errors';
import { LOCATION_INDEX } from './locations.data';
import type {
  DistrictRecord,
  LocationIndex,
  LocationItem,
  ProvinceRecord,
  WardRecord,
} from './locations.data';

const toItem = ({ code, name }: LocationItem): LocationItem => ({ code, name });

export interface ResolvedAddress {
  province: LocationItem;
  district: LocationItem;
  // null khi quận/huyện không có phường/xã (vd huyện đảo)
  ward: LocationItem | null;
}

@Injectable()
export class LocationsService {
  private index: LocationIndex = LOCATION_INDEX;

  // Dùng cho test với dữ liệu nhỏ (constructor không nhận tham số để Nest DI không phải inject)
  static withIndex(index: LocationIndex) {
    const service = new LocationsService();
    service.index = index;
    return service;
  }

  getProvinces(): LocationItem[] {
    return this.index.provinces.map(toItem);
  }

  getDistricts(provinceCode: string): LocationItem[] {
    const province = this.index.provinceByCode.get(provinceCode);
    if (!province) {
      throw notFound('PROVINCE_NOT_FOUND', 'Không tìm thấy tỉnh/thành phố');
    }
    return province.districts.map(toItem);
  }

  // Quận/huyện không có phường/xã thì trả mảng rỗng (200), không phải 404
  getWards(districtCode: string): LocationItem[] {
    const district = this.index.districtByCode.get(districtCode);
    if (!district) {
      throw notFound('DISTRICT_NOT_FOUND', 'Không tìm thấy quận/huyện');
    }
    return district.wards.map(toItem);
  }

  // Dùng khi đặt đơn: kiểm mã tồn tại và đúng quan hệ cha-con, trả tên từng cấp để đơn chụp lại.
  // Quận/huyện có ít nhất 1 phường/xã thì wardCode bắt buộc; không có thì wardCode phải bỏ trống.
  resolveAddress(
    provinceCode: string,
    districtCode: string,
    wardCode?: string | null,
  ): ResolvedAddress {
    const province: ProvinceRecord | undefined =
      this.index.provinceByCode.get(provinceCode);
    if (!province) {
      throw badRequest('PROVINCE_NOT_FOUND', 'Tỉnh/thành phố không hợp lệ');
    }
    const district: DistrictRecord | undefined =
      this.index.districtByCode.get(districtCode);
    if (!district) {
      throw badRequest('DISTRICT_NOT_FOUND', 'Quận/huyện không hợp lệ');
    }
    if (district.provinceCode !== province.code) {
      throw badRequest(
        'DISTRICT_NOT_IN_PROVINCE',
        'Quận/huyện không thuộc tỉnh/thành phố đã chọn',
      );
    }

    const hasWardCode = wardCode !== undefined && wardCode !== null;
    if (district.wards.length === 0) {
      if (hasWardCode) {
        throw badRequest(
          'WARD_NOT_ALLOWED',
          'Quận/huyện này không có phường/xã, vui lòng bỏ trống phường/xã',
        );
      }
      return {
        province: toItem(province),
        district: toItem(district),
        ward: null,
      };
    }

    if (!hasWardCode) {
      throw badRequest('WARD_REQUIRED', 'Vui lòng chọn phường/xã');
    }
    const ward: WardRecord | undefined = this.index.wardByCode.get(wardCode);
    if (!ward) {
      throw badRequest('WARD_NOT_FOUND', 'Phường/xã không hợp lệ');
    }
    if (ward.districtCode !== district.code) {
      throw badRequest(
        'WARD_NOT_IN_DISTRICT',
        'Phường/xã không thuộc quận/huyện đã chọn',
      );
    }
    return {
      province: toItem(province),
      district: toItem(district),
      ward: toItem(ward),
    };
  }
}

// Chuỗi địa chỉ ghép đầy đủ để in phiếu; bỏ qua phần phường/xã khi không có
export function formatShippingAddress(
  addressLine: string,
  address: ResolvedAddress,
) {
  return [
    addressLine,
    address.ward?.name,
    address.district.name,
    address.province.name,
  ]
    .filter(Boolean)
    .join(', ');
}
