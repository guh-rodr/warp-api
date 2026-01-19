import { ListCustomersQueryDto } from 'src/modules/customer/dto/list-customers.dto';

export function buildPrismaPagination(options: ListCustomersQueryDto) {
  const { page } = options;

  const take = options.autocomplete === 'true' ? 5 : 10;
  const skip = (page - 1) * take;

  return {
    take,
    skip,
  };
}
