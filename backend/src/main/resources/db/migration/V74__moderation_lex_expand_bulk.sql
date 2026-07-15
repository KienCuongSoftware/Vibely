-- Bulk expand sexual/vulgar + violence lexicons (VI + EN + obfuscations).
-- Sync caption gate loads BLOCK lex.* from DB; workers use the same rule_versions.

UPDATE moderation_rules
SET
    match_json = '{
      "type":"lexicon",
      "fields":["title","description","ocr_text","speech_text"],
      "patterns":[
        "đầu\\s*buồi","dau\\s*buoi","buồi","\\bbuoi\\b","cặc","\\bcak\\b","cặc\\s*to",
        "lồn","\\bloz\\b","lìn","đít\\s*to","lồn\\s*to","liếm\\s*lồn","liem\\s*lon",
        "địt\\s*mẹ","dit\\s*me","đụ\\s*mẹ","du\\s*me","địt\\s*con\\s*mẹ","mẹ\\s*mày","me\\s*may",
        "đụ\\s*má","du\\s*ma","đjt\\s*mẹ","djt\\s*me","\\bđcm\\b","\\bdcm\\b","\\bvcl\\b",
        "con\\s*đĩ","con\\s*di\\b","\\bđĩ\\b","điếm","gái\\s*gọi","gai\\s*goi","gái\\s*bao","gai\\s*bao",
        "bú\\s*cu","bu\\s*cu","\\bchịch\\b","\\bchich\\b","đụ\\s*nhau","dit\\s*nhau","nện\\s*nhau",
        "làm\\s*tình","lam\\s*tinh","quan\\s*hệ\\s*tình\\s*dục","xem\\s*sex","clip\\s*sex","phim\\s*sex",
        "ảnh\\s*nóng","anh\\s*nong","video\\s*nóng","video\\s*nong","ảnh\\s*sexy","khoe\\s*vú","khoe\\s*vu",
        "khoe\\s*đít","khoe\\s*dit","không\\s*mặc\\s*quần","khong\\s*mac\\s*quan","nude\\s*challenge",
        "sex\\s*chat","chat\\s*sex","sexy\\s*live","live\\s*sex","cam\\s*sex","sex\\s*tape",
        "only\\s*fans","onlyfans","fansly","pornhub","xvideos","\\bxnxx\\b","\\bxxx\\b","\\bporn\\b",
        "\\bnudes?\\b","nude\\s*pic","send\\s*nudes","free\\s*nudes","follow\\s*(?:for|of|4)\\s*nudes?",
        "\\bfuck\\b","fucking","motherfucker","\\bcunt\\b","\\bpussy\\b","\\bdick\\b","\\bcock\\b",
        "\\btits?\\b","\\bboobs\\b","\\bwhore\\b","\\bslut\\b","\\bbitch\\b","asshole",
        "deepthroat","creampie","cumshot","hentai\\s*rape","\\blolicon\\b",
        "child\\s*porn","underage\\s*sex","teen\\s*porn","cp\\s*trade",
        "phim\\s*18\\+","18\\+\\s*sex","\\bjav\\b","av\\s*nhật","sugar\\s*baby","happy\\s*ending",
        "đéo\\s*chịu","\\bđéo\\b","\\bcứt\\b","\\bcmm\\b"
      ],
      "flags":"i"
    }'::jsonb,
    description = 'Expanded VI/EN sexual + vulgar lexicon → BLOCK + auto-ban',
    action_hint = 'BLOCK',
    severity = 'HIGH',
    points = 45,
    enabled = TRUE
WHERE code = 'lex.sexual_vi';

UPDATE moderation_rules
SET
    match_json = '{
      "type":"lexicon",
      "fields":["title","description","ocr_text","speech_text"],
      "patterns":[
        "giết\\s*người","giet\\s*nguoi","giết\\s*chết","giet\\s*chet","giết\\s*hết","giet\\s*het",
        "ám\\s*sát","am\\s*sat","thảm\\s*sát","tham\\s*sat","tàn\\s*sát","tan\\s*sat",
        "khủng\\s*bố","khung\\s*bo","khủng bố","đặt\\s*bom","dat\\s*bom","đánh\\s*bom","danh\\s*bom",
        "chém\\s*giết","chem\\s*giet","chém\\s*đầu","chem\\s*dau","đâm\\s*chết","dam\\s*chet",
        "bắn\\s*chết","ban\\s*chet","bắn\\s*súng","ban\\s*sung","xả\\s*súng","xa\\s*sung",
        "đánh\\s*chết","danh\\s*chet","đập\\s*chết","dap\\s*chet","treo\\s*cổ","treo\\s*co",
        "cắt\\s*cổ","cat\\s*co","cắt\\s*đầu","cat\\s*dau","thiêu\\s*sống","thieu\\s*song",
        "hiếp\\s*dâm","hiep\\s*dam","cưỡng\\s*hiếp","cuong\\s*hiep","cưỡng\\s*bức","cuong\\s*buc",
        "hãm\\s*hiếp","ham\\s*hiep","tra\\s*tấn","tra\\s*tan","hành\\s*hạ","hanh\\s*ha",
        "tự\\s*sát","tu\\s*sat","tự\\s*vẫn","tu\\s*van","suicide","kill\\s*myself",
        "school\\s*shooting","mass\\s*shooting","terror\\s*attack","bomb\\s*threat",
        "\\bkill\\s+(you|people|him|her|them|everyone)\\b","i\\s*will\\s*kill","i''ll\\s*kill",
        "\\bgore\\b","bloodbath","behead","decapitat","\\bmassacre\\b","\\bgenocide\\b",
        "stab\\s*to\\s*death","gunfight","\\bmurder\\b","\\bhomicide\\b","serial\\s*killer",
        "make\\s*a\\s*bomb","how\\s*to\\s*kill","die\\s*bitch","rape\\s*and\\s*kill",
        "isis","al\\s*-?qaeda","join\\s*isis","pipeline\\s*attack",
        "khủng bố","ám sát","thảm sát","xả súng","đặt bom","đánh bom",
        "chặt\\s*đầu","chat\\s*dau","mổ\\s*bụng","mo\\s*bung","moi\\s*ruột","moi\\s*ruot",
        "đốt\\s*nhà","dot\\s*nha","phá\\s*hoại","pha\\s*hoai","tấn\\s*công\\s*khủng\\s*bố"
      ],
      "flags":"i"
    }'::jsonb,
    description = 'Expanded VI/EN violence + threat lexicon → BLOCK + auto-ban',
    action_hint = 'BLOCK',
    severity = 'HIGH',
    points = 45,
    enabled = TRUE
WHERE code = 'lex.violence_vi';

UPDATE moderation_rule_versions rv
SET
    match_json = r.match_json,
    action_hint = r.action_hint,
    severity = r.severity,
    points = r.points,
    description = r.description
FROM moderation_rules r, policy_versions pv
WHERE rv.rule_code = r.code
  AND rv.policy_version_id = pv.id
  AND pv.code = '2026.07.1'
  AND r.code IN ('lex.sexual_vi', 'lex.violence_vi');

-- Also broaden legacy lex.spam bait list (kept for older evidence paths).
UPDATE moderation_rules
SET
    match_json = '{
      "type":"lexicon",
      "fields":["ocr_text","speech_text","title","description"],
      "patterns":[
        "\\btelegram\\s*@\\w+","\\bbit\\.ly/","\\bfollow\\s*(?:for|of|4)\\s*nudes?",
        "\\bfollow\\s+me\\s+for\\s+nudes?","\\bfree\\s+nudes?","\\bonly\\s*fans\\b",
        "send\\s*nudes","nude\\s*for\\s*follow","link\\s+in\\s+bio\\s+for\\s+nudes?",
        "\\bporn\\b","\\bxxx\\b","pornhub","xvideos","fansly","sex\\s*for\\s*sale"
      ],
      "flags":"i"
    }'::jsonb,
    action_hint = 'BLOCK',
    severity = 'HIGH',
    points = 40
WHERE code = 'lex.spam';

UPDATE moderation_rule_versions rv
SET
    match_json = r.match_json,
    action_hint = r.action_hint,
    severity = r.severity,
    points = r.points
FROM moderation_rules r, policy_versions pv
WHERE rv.rule_code = r.code
  AND rv.policy_version_id = pv.id
  AND pv.code = '2026.07.1'
  AND r.code = 'lex.spam';

UPDATE policy_versions
SET notes = 'Phase 1–4 + auto-ban + bulk VI/EN sexual & violence lexicons (V74)'
WHERE code = '2026.07.1';
