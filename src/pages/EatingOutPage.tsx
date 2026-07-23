export function EatingOutPage() {
  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 20px 64px' }}>

      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '24px', color: 'var(--foreground)' }}>
        식사할 때 다음 세가지를 꼭 기억하세요!
      </h1>

      <div style={{ marginBottom: '40px', padding: '40px', background: 'var(--muted)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0' }}>

        <div style={{ paddingBottom: '32px' }}>
          <p style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--foreground)' }}>
            1. 첨가당 많이 들어간 것은 최대한 적게 드세요
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', marginBottom: '12px' }}>
            *첨가당: 설탕, 물엿, 조청 등
          </p>
          <ul style={{ paddingLeft: '16px', listStyle: 'disc', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              '탕수육 소스, 양념치킨의 양념, 돈까스 소스',
              '햄버거/서브웨이의 소스',
              '떡볶이 국물',
              '빵 (특히 케이크, 롤케이크, 카스테라, 단팥빵 등 달달한 빵류), 과자, 호떡, 붕어빵',
              '설탕 들어간 각종 음료. (바닐라 라떼, 콜라 등. 밥먹고 까페갈 때 되도록 설탕 없는 음료 마시기)',
            ].map((item, i) => (
              <li key={i} style={{ fontSize: '0.92rem', color: 'var(--muted-foreground)' }}>{item}</li>
            ))}
          </ul>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0 0 32px' }} />

        <div style={{ paddingBottom: '32px' }}>
          <p style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--foreground)' }}>
            2. 탄수화물 비중 높은 음식 먹을 때는 탄수화물 양을 절반 정도로 줄이고 대신 고기를 같이 드세요.
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', marginBottom: '12px' }}>
            *단백질 파우더를 들고 다니는 것도 좋아요. 디저트 카페에서 고기를 같이 먹을 수 없으니까요.
          </p>
          <ul style={{ paddingLeft: '16px', listStyle: 'disc', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              '면류: 짜장, 라면, 콩국수, 냉면, 쫄면',
              '흰쌀밥',
              '밀가루 음식: 빵, 과자, 샌드위치, 호떡, 붕어빵',
              '떡류',
            ].map((item, i) => (
              <li key={i} style={{ fontSize: '0.92rem', color: 'var(--muted-foreground)' }}>{item}</li>
            ))}
          </ul>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0 0 32px' }} />

        <div>
          <p style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--foreground)' }}>
            3. 지방 비율 높은 음식 먹을 때는 딱 1인분만 먹고 다음날 한 끼 굶는 것이 좋아요.
          </p>
          <p style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '6px' }}>
            고기 중 지방 비율 높은 것: 삼겹살, 꽃등심, 립아이, 곱창, 대창
          </p>
          <ul style={{ paddingLeft: '16px', listStyle: 'disc', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
            <li style={{ fontSize: '0.92rem', color: 'var(--muted-foreground)' }}>삼겹살 1인분의 지방 함량은 한끼 섭취 권장량보다 약 2.5배 더 많아요.</li>
          </ul>
          <ul style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
            {[
              '삼겹살 1인분: 200g 기준',
              '삼겹살 1인분의 지방 함량: 약 70~80g',
              '한끼 섭취 권장량: 15~28g. 한국 성인 남성 기준',
            ].map((item, i) => (
              <li key={i} style={{ fontSize: '0.92rem', color: 'var(--muted-foreground)' }}>* {item}</li>
            ))}
          </ul>
          <p style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '6px' }}>
            그외 지방 비율 높은 음식
          </p>
          <p style={{ fontSize: '0.92rem', color: 'var(--muted-foreground)', marginBottom: '10px' }}>
            삼겹살만큼은 아니지만 여전히 칼로리가 높으므로 너무 자주 섭취하지 않는 것이 좋아요. 주 1회 미만으로 섭취 빈도를 줄여주시는 것이 좋아요.
          </p>
          <ul style={{ paddingLeft: '16px', listStyle: 'disc', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              '기름에 튀기거나 볶은 음식: 탕수육, 치킨, 돈까스, 볶음밥, 핫도그',
              '치즈 들어간 음식: 피자, 크림 파스타',
            ].map((item, i) => (
              <li key={i} style={{ fontSize: '0.92rem', color: 'var(--muted-foreground)' }}>{item}</li>
            ))}
          </ul>
        </div>

      </div>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', color: 'var(--foreground)' }}>
          🩸 칼로리보다는 '혈당'부터 신경쓰기
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <p style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--foreground)' }}>살 안 찌려면 먹는 '순서'가 중요해요.</p>
            <p style={{ color: 'var(--muted-foreground)', lineHeight: 1.7, fontSize: '0.92rem' }}>지방을 태우려면 혈당이 안정적이어야 해요. 먹는 순서만 바꿔도 혈당 스파이크를 완화해줘요. 채소·단백질 먼저, 탄수화물은 나중에.</p>
          </div>
          <div>
            <p style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--foreground)' }}>식사 후 10~15분만 걸어도 혈당을 낮출 수 있어요.</p>
            <p style={{ color: 'var(--muted-foreground)', lineHeight: 1.7, fontSize: '0.92rem' }}>가볍게 걷는 것만으로도 혈당이 천천히 오르도록 도와줘요.</p>
          </div>
          <div>
            <p style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--foreground)' }}>과일 많이 먹어도 괜찮다? NO.</p>
            <p style={{ color: 'var(--muted-foreground)', lineHeight: 1.7, fontSize: '0.92rem' }}>과일은 건강식이지만 당류 총량은 여전히 신경 써야 해요. 특히 포도, 망고처럼 당도 높은 과일은 더 그래요.</p>
          </div>
        </div>
      </section>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0 0 40px' }} />

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', color: 'var(--foreground)' }}>
          ⚖️ 무조건 "적게" 먹기? NO. 탄단지 "균형"이 중요!
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <p style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--foreground)' }}>너무 적게 먹으면 오히려 살찌는 체질이 돼요</p>
            <p style={{ color: 'var(--muted-foreground)', lineHeight: 1.7, fontSize: '0.92rem' }}>극단적으로 칼로리를 줄이면, 몸은 위기를 느끼고 지방을 더 쌓아두려고 해요.</p>
          </div>
          <div>
            <p style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--foreground)' }}>단백질 부족하면 근육 빠지고, 오히려 살찌기 쉬운 몸이 돼요</p>
            <p style={{ color: 'var(--muted-foreground)', lineHeight: 1.7, fontSize: '0.92rem' }}>근육이 줄면 기초대사량도 같이 떨어져서, 같은 양을 먹어도 예전보다 살이 더 쉽게 붙어요. 반대로 과다 섭취하면 콩팥(신장)에 부담을 주게 돼요.</p>
          </div>
          <div>
            <p style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--foreground)' }}>지방은 '과다섭취'를 주의하세요</p>
            <p style={{ color: 'var(--muted-foreground)', lineHeight: 1.7, fontSize: '0.92rem' }}>치킨, 피자, 튀김 음식처럼 평소 즐겨 먹는 음식들에 지방이 많아서 주의가 필요해요.</p>
          </div>
        </div>
      </section>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0 0 40px' }} />

      <section>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', color: 'var(--foreground)' }}>
          🔢 체중계 숫자에 흔들리지 마세요
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <p style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--foreground)' }}>체중계 숫자, 줄어드는 것이 오히려 더 안 좋을 수도 있어요.</p>
            <p style={{ color: 'var(--muted-foreground)', lineHeight: 1.7, fontSize: '0.92rem' }}>그 줄어든 숫자가 체지방이 빠진 것이 아니라 근육이 빠진 것이라면 좋지 않아요. 체중계의 숫자보다 눈바디(눈으로 보는 몸의 변화)를 믿으세요.</p>
          </div>
          <div>
            <p style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--foreground)' }}>오늘 1kg 늘었다고 좌절하지 마세요</p>
            <p style={{ color: 'var(--muted-foreground)', lineHeight: 1.7, fontSize: '0.92rem' }}>물 한 잔만 마셔도 하루 체중은 1~2kg 왔다 갔다 해요. 매일 체중계에 일희일비할 필요 없어요.</p>
          </div>
        </div>
      </section>

    </div>
  )
}
