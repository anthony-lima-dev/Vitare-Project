import { Controller, Get, Query } from '@nestjs/common';
import { SearchDiseaseDto } from './dto/search-disease.dto';
import { DiseaseDictionaryService } from '../../application/disease-dictionary.service';

@Controller('disease-dictionary')
export class DiseaseDictionaryController {
  constructor(private readonly service: DiseaseDictionaryService) {}

  @Get()
  search(@Query() query: SearchDiseaseDto) {
    return this.service.search(query.search);
  }
}
