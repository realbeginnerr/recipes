import { StorySection, StorySplit } from '../components/StorySection'
import { Button } from '../components/ui/button'
﻿import { Link } from 'react-router-dom'
import { useSearch } from '../context/SearchContext'
import { useLanguage } from '../context/LanguageContext'
import { aboutCopy } from '../i18n/about'
import { useScrollReveal } from '../hooks/useScrollReveal'
import './AboutPage.css'

export function AboutPage() {
  const { language } = useLanguage()
  const copy = aboutCopy[language]
  const { resetHome } = useSearch()
  const revealRoot = useScrollReveal()

  return <div ref={revealRoot} className="service-page" lang={language}>
    <section className="story-hero" aria-labelledby="story-title" style={{ backgroundImage: `url("${import.meta.env.BASE_URL}images/service/01.png")` }}>
      <div className="story-hero-content">
        <h3 id="story-title">{copy.heroFirst && <>{copy.heroFirst}<br /></>}{language === 'ko' ? copy.heroLast.split('냉장고 털기').map((part, index) => <span key={index}>{index > 0 && <strong>냉장고 털기</strong>}{part}</span>) : copy.heroLast}</h3>
        <p className="story-intro">{copy.introFirst}{copy.introLast && <><br />{copy.introLast}</>}</p>
      </div>
    </section>
    <StorySplit number="01" id="story-start" titleId="story-background" title={<>{language === 'ko' ? copy.storyTitleFirst.split('어디까지').map((part, index) => <span key={index}>{index > 0 && <strong>어디까지</strong>}{part}</span>) : copy.storyTitleFirst}{copy.storyTitleLast && <><br />{copy.storyTitleLast}</>}</>} eyebrow={language === 'ko' ? undefined : copy.storyLabel} image={{ src: `${import.meta.env.BASE_URL}images/service/02.png`, alt: copy.tableAlt }}>
      {copy.story.split('\n\n').map((paragraph, index) => <p key={index}>{paragraph}</p>)}{copy.quote && <blockquote>{copy.quote}</blockquote>}
    </StorySplit>
    <StorySection number="02" titleId="story-meeting" title={language === 'ko' ? copy.meetingTitle.split('왔다갔다').map((part, index) => <span key={index}>{index > 0 && <strong>왔다갔다</strong>}{part}</span>) : copy.meetingTitle}>
      <p style={{ whiteSpace: 'pre-line' }}>{copy.meeting}</p>
    </StorySection>
    <StorySplit number="03" titleId="story-meal" title={language === 'ko' ? copy.mealTitle.split('어디에').map((part, index) => <span key={index}>{index > 0 && <strong>어디에</strong>}{part}</span>) : copy.mealTitle} tone="dark" imageSide="right" image={{ src: `${import.meta.env.BASE_URL}images/service/03.png`, alt: copy.bowlsAlt }}>
      {copy.mealFirst.split('\n\n').map((paragraph, index) => <p key={index}>{paragraph}</p>)}{'mealLast' in copy && <p>{copy.mealLast}</p>}
    </StorySplit>
    <StorySection number="04" titleId="story-continue" title={language === 'ko' ? <><strong>내 입맛</strong>에 맞추기</> : copy.continueTitle} tone="soft">
      <p style={{ whiteSpace: 'pre-line' }}>{copy.continue}</p>
    </StorySection>
    <StorySection number="05" titleId="story-origin" title={language === 'ko' ? <><strong>내 목표 탄단지</strong>에 맞추기</> : copy.originTitle} banner={{ src: `${import.meta.env.BASE_URL}images/service/04.jpg`, alt: copy.ritualAlt }}>
      <p>{copy.origin}</p>
      <div className="story-action"><Button nativeButton={false} render={<Link to="/recipes" onClick={resetHome} />} size="header" className="reference-request">{copy.browse}</Button></div>
    </StorySection>
  </div>
}
