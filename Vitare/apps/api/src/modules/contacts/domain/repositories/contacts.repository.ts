import { EmergencyContact } from '../entities/emergency-contact.entity';

export abstract class ContactsRepository {
  abstract findAllByUser(userId: string): Promise<EmergencyContact[]>;
  abstract findById(id: string): Promise<EmergencyContact | null>;
  abstract create(
    userId: string,
    data: {
      name: string;
      phone: string;
      relationship?: string;
      isPrimary?: boolean;
    },
  ): Promise<EmergencyContact>;
  abstract remove(id: string): Promise<void>;
}
