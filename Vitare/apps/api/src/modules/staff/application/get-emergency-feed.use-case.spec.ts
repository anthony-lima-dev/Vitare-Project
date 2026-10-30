// eslint-disable-file @typescript-eslint/no-unsafe-assignment -- test mocks
// eslint-disable-file @typescript-eslint/no-unsafe-member-access -- test mocks
// eslint-disable-file @typescript-eslint/no-unsafe-call -- test mocks
// eslint-disable-file @typescript-eslint/no-unsafe-return -- test mocks
// eslint-disable-file @typescript-eslint/no-explicit-any -- test mocks
// eslint-disable-file @typescript-eslint/require-await -- test mocks

import { EmergencyFeedRepository } from '../domain/repositories/emergency-feed.repository';
import {
  DEFAULT_EMERGENCY_FEED_LIMIT,
  GetEmergencyFeedUseCase,
  MAX_EMERGENCY_FEED_LIMIT,
} from './get-emergency-feed.use-case';

describe('GetEmergencyFeedUseCase — clamp do limite', () => {
  const repository = { findRecent: jest.fn().mockResolvedValue([]) };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function makeService() {
    return new GetEmergencyFeedUseCase(repository);
  }

  it('limita a consulta ao máximo de 100 registros', async () => {
    await makeService().execute(500);
    expect(repository.findRecent).toHaveBeenCalledWith(
      MAX_EMERGENCY_FEED_LIMIT,
    );
  });

  it('sem limite usa o default de 50 registros', async () => {
    await makeService().execute(undefined);
    expect(repository.findRecent).toHaveBeenCalledWith(
      DEFAULT_EMERGENCY_FEED_LIMIT,
    );
  });

  it('mínimo de 1 registro', async () => {
    await makeService().execute(0);
    expect(repository.findRecent).toHaveBeenCalledWith(1);
  });
});
