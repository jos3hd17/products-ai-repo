import { BadRequestException, PipeTransform } from '@nestjs/common';
/** Cookie-only operations accept no payload beyond an empty JSON object. */
export class EmptyBodyPipe implements PipeTransform<unknown, undefined> {
  transform(value:unknown):undefined {
    if (value !== undefined && (value === null || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length > 0)) throw new BadRequestException('This operation does not accept body properties');
    return undefined;
  }
}
