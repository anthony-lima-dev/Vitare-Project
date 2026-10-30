import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class StaffJwtAuthGuard extends AuthGuard('staff-jwt') {}
