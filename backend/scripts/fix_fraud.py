import os

path = 'backend/app/models/fraud.py'
with open(path, 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.strip().startswith('campaign_payments: Mapped[list["CampaignPayment"]]'):
        new_lines.append(line)
        break
    new_lines.append(line)

new_lines.append('\n\n')
new_lines.append('class CampaignPayment(Base):\n')
new_lines.append('    __tablename__ = "campaign_payments"\n\n')
new_lines.append('    campaign_id: Mapped[str] = mapped_column(String(50), ForeignKey("attack_campaigns.id"), primary_key=True)\n')
new_lines.append('    payment_id: Mapped[str] = mapped_column(String(50), ForeignKey("payments.id"), primary_key=True)\n')
new_lines.append('    reason: Mapped[str | None] = mapped_column(Text, nullable=True)\n\n')
new_lines.append('    campaign: Mapped["AttackCampaign"] = relationship("AttackCampaign", back_populates="campaign_payments")\n')
new_lines.append('    payment: Mapped["Payment"] = relationship("Payment", back_populates="campaign_payments")\n\n')

new_lines.append('class Requester(Base):\n')
new_lines.append('    __tablename__ = "requesters"\n\n')
new_lines.append('    id: Mapped[str] = mapped_column(String(50), primary_key=True, default=generate_uuid, index=True)\n')
new_lines.append('    name: Mapped[str] = mapped_column(String(255), nullable=False)\n')
new_lines.append('    department: Mapped[str | None] = mapped_column(String(100), nullable=True)\n\n')

new_lines.append('class GroundTruthCase(Base):\n')
new_lines.append('    __tablename__ = "ground_truth_cases"\n\n')
new_lines.append('    case_id: Mapped[str] = mapped_column(String(50), primary_key=True, default=generate_uuid, index=True)\n')
new_lines.append('    payment_id: Mapped[str] = mapped_column(String(50), ForeignKey("payments.id"), nullable=False)\n')
new_lines.append('    fraud_label: Mapped[bool] = mapped_column(Boolean, nullable=False)\n')

with open(path, 'w') as f:
    f.writelines(new_lines)

print("Fixed fraud.py")
