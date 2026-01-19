import { PartialType } from '@nestjs/mapped-types';
import { CreateModelBodyDto } from './create-model.dto';

export class UpdateModelBodyDto extends PartialType(CreateModelBodyDto) {}
