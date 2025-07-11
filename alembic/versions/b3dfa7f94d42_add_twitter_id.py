"""Add twitter_id

Revision ID: b3dfa7f94d42
Revises: 9590fa7492d4
Create Date: 2025-06-28 18:39:11.607368

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b3dfa7f94d42'
down_revision = '9590fa7492d4'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('coin_tweet_analysis', sa.Column('twitter_id', sa.String(length=255), nullable=False))
    op.create_index(op.f('ix_coin_tweet_analysis_twitter_id'), 'coin_tweet_analysis', ['twitter_id'], unique=True)
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f('ix_coin_tweet_analysis_twitter_id'), table_name='coin_tweet_analysis')
    op.drop_column('coin_tweet_analysis', 'twitter_id')
    # ### end Alembic commands ###
