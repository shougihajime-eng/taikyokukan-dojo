-- かり局面の入れ直し（削除→再投入）が、けいこ記録に参照されていると失敗する問題の修正。
-- guesses は出題時の実際値をぜんぶスナップショット保存しているので、
-- 局面が消えても紐付けを null にするだけで分析・成績に影響はない。
alter table taikyokukan.guesses alter column position_id drop not null;
alter table taikyokukan.guesses drop constraint guesses_position_id_fkey;
alter table taikyokukan.guesses
  add constraint guesses_position_id_fkey
  foreign key (position_id) references taikyokukan.positions (id) on delete set null;
