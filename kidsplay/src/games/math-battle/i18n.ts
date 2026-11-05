const nums = (words: string[]) => Object.fromEntries(words.map((w, i) => [String(i + 1), w]));

export const mathStrings = {
  en: {
    q: { count: 'How many do you see?', recognize: 'Which number is "{{word}}"?', bigger: 'Which number is the biggest?' },
    num: nums(['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']),
    hint: {
      count: 'Touch each one with your finger and count out loud.', recognize: 'Count up from 1 on your fingers.', compare: 'The biggest number is the one you reach last when counting.',
      add: 'Start with the bigger number and count up.', sub: 'Start with the first number and count back.', missing: 'What do you add to the first number to reach the total?',
      mul: 'Multiplying is adding the same number again and again.', div: 'How many groups of the second number fit in the first?', order: 'Multiply first, then add!',
      brackets: 'Solve the part in brackets first.', fractionOf: 'Divide by the bottom number, then multiply by the top.', fractionAdd: 'Same bottom number? Just add the tops!', pack: 'Read carefully and think it through.',
    },
    start: 'Start race', source: 'Questions', generated: 'Surprise me (mixed)', round: 'Round {{n}} of {{total}}', turn: "{{name}}'s turn", correct: 'Correct!', tryAgain: 'Try again!',
    finish: 'Finish', timer: 'Answer timer', timeUp: "Time's up!", rules: 'Answer questions to move your runner forward. Reach the finish flag to win!',
    rulesVs: 'Players take turns answering the same kind of question. A correct answer moves you one step. After 8 rounds each, the player furthest ahead wins!',
    level: 'Level {{n}}',
  },
  ar: {
    q: { count: 'كم عددها؟', recognize: 'أي رقم هو "{{word}}"؟', bigger: 'أي رقم هو الأكبر؟' },
    num: nums(['واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة']),
    hint: {
      count: 'المس كل واحدة بإصبعك وعدّ بصوت عالٍ.', recognize: 'عُدّ من ١ على أصابعك.', compare: 'الرقم الأكبر هو الذي تصل إليه أخيرًا عند العد.',
      add: 'ابدأ بالرقم الأكبر وعُدّ للأعلى.', sub: 'ابدأ بالرقم الأول وعُدّ للخلف.', missing: 'ماذا تضيف إلى الرقم الأول لتصل إلى المجموع؟',
      mul: 'الضرب هو جمع الرقم نفسه مرات عديدة.', div: 'كم مجموعة من الرقم الثاني تتسع في الأول؟', order: 'اضرب أولًا ثم اجمع!',
      brackets: 'حُلّ ما بين القوسين أولًا.', fractionOf: 'اقسم على المقام ثم اضرب في البسط.', fractionAdd: 'المقامات متساوية؟ اجمع البسوط فقط!', pack: 'اقرأ بتمعّن وفكّر جيدًا.',
    },
    start: 'ابدأ السباق', source: 'الأسئلة', generated: 'فاجئني (متنوعة)', round: 'الجولة {{n}} من {{total}}', turn: 'دور {{name}}', correct: 'صحيح!', tryAgain: 'حاول مرة أخرى!',
    finish: 'النهاية', timer: 'مؤقت الإجابة', timeUp: 'انتهى الوقت!', rules: 'أجب عن الأسئلة لتقدّم عدّاءك. اصل إلى علم النهاية لتفوز!',
    rulesVs: 'يتناوب اللاعبان على الإجابة عن النوع نفسه من الأسئلة. الإجابة الصحيحة تقدّمك خطوة. بعد ٨ جولات لكل لاعب، يفوز الأبعد!',
    level: 'المستوى {{n}}',
  },
};
