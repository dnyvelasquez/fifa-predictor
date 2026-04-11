import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParticipanteDialog } from './participante-dialog';

describe('ParticipanteDialog', () => {
  let component: ParticipanteDialog;
  let fixture: ComponentFixture<ParticipanteDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParticipanteDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ParticipanteDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
