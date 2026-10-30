import { Controller, Get, Query } from '@nestjs/common';
import { SearchMedicationDto } from './dto/search-medication.dto';
import { MedicationsDictionaryService } from '../../application/medications-dictionary.service';

@Controller('medications-dictionary')
export class MedicationsDictionaryController {
  constructor(private readonly service: MedicationsDictionaryService) {}

  @Get()
  search(@Query() query: SearchMedicationDto) {
    return this.service.search(query.search);
  }
}
